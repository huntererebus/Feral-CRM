import { db } from "@/lib/db";
import {
  canUploadSourceMedia,
  canUploadDraftOrFinalMedia,
  canViewProject,
  canViewMediaAsset,
  assert,
  type SessionUser,
  type ProjectScope,
} from "@/lib/rbac";
import { buildStorageKey, createPresignedUploadUrl, createPresignedDownloadUrl } from "@/lib/storage";
import { MEDIA_MAX_FILE_SIZE_BYTES, isAllowedMediaMimeType } from "@/lib/constants";
import { recordAudit } from "@/lib/audit";
import { initiateMediaUploadSchema, confirmMediaUploadSchema } from "@/lib/validation/media";
import type { z } from "zod";

export { initiateMediaUploadSchema, confirmMediaUploadSchema } from "@/lib/validation/media";

/** Same shape/reasoning as projects.ts's toScope. */
function toScope(project: {
  organizationId: string;
  clientId: string;
  accountManagerId: string | null;
  editorId: string | null;
  members?: { userId: string }[];
}): ProjectScope {
  return {
    organizationId: project.organizationId,
    clientId: project.clientId,
    accountManagerId: project.accountManagerId,
    editorId: project.editorId,
    memberUserIds: project.members?.map((m) => m.userId) ?? [],
  };
}

async function loadProjectForMedia(projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { members: { select: { userId: true } } },
  });
  assert(project !== null, "Project not found.");
  return project;
}

export async function initiateMediaUpload(
  actor: SessionUser,
  projectId: string,
  input: z.infer<typeof initiateMediaUploadSchema>,
  ipAddress: string | null
) {
  const project = await loadProjectForMedia(projectId);
  const scope = toScope(project);

  const canUpload = input.kind === "source" ? canUploadSourceMedia(actor, scope) : canUploadDraftOrFinalMedia(actor, scope);
  assert(canUpload, "You don't have permission to upload this kind of media on this project.");

  assert(isAllowedMediaMimeType(input.fileType), "Unsupported file type — expected video, audio, or image.");
  const maxBytes = MEDIA_MAX_FILE_SIZE_BYTES[input.kind];
  // Every MediaKind key really is populated in constants.ts; this assert
  // is what lets TS narrow away the `| undefined` from noUncheckedIndexedAccess,
  // not a real "unconfigured kind" case we expect to hit.
  assert(maxBytes !== undefined, `No upload limit configured for media kind ${input.kind}.`);
  assert(input.fileSizeBytes <= maxBytes, `File exceeds the ${input.kind} upload size limit.`);

  let assetId: string;
  let versionNumber: number;

  if (input.assetId) {
    const asset = await db.mediaAsset.findFirst({
      where: { id: input.assetId, projectId, kind: input.kind, archivedAt: null },
    });
    assert(asset !== null, "assetId must reference an existing, active asset of this kind on this project.");
    const lastVersion = await db.mediaVersion.findFirst({
      where: { mediaAssetId: asset.id },
      orderBy: { versionNumber: "desc" },
    });
    assetId = asset.id;
    versionNumber = (lastVersion?.versionNumber ?? 0) + 1;
  } else {
    const asset = await db.mediaAsset.create({
      data: { projectId, kind: input.kind, createdById: actor.id },
    });
    assetId = asset.id;
    versionNumber = 1;
  }

  const storageKey = buildStorageKey({
    organizationId: project.organizationId,
    clientId: project.clientId,
    projectId,
    kind: input.kind,
    versionNumber,
    filename: input.filename,
  });

  const version = await db.mediaVersion.create({
    data: {
      mediaAssetId: assetId,
      versionNumber,
      filename: input.filename,
      fileType: input.fileType,
      fileSizeBytes: BigInt(input.fileSizeBytes),
      storageProvider: "r2",
      storageKey,
      status: "uploading",
      uploadedById: actor.id,
    },
  });

  const { url, expiresAt } = await createPresignedUploadUrl(storageKey, input.fileType);

  await recordAudit({
    userId: actor.id,
    organizationId: project.organizationId,
    clientId: project.clientId,
    action: "media.upload_initiated",
    resourceType: "media_version",
    resourceId: version.id,
    metadata: { kind: input.kind, assetId, versionNumber },
    ipAddress,
  });

  return { assetId, versionId: version.id, versionNumber, storageKey, uploadUrl: url, expiresAt };
}

export async function confirmMediaUpload(
  actor: SessionUser,
  projectId: string,
  versionId: string,
  input: z.infer<typeof confirmMediaUploadSchema>,
  ipAddress: string | null
) {
  const project = await loadProjectForMedia(projectId);

  const version = await db.mediaVersion.findFirst({
    where: { id: versionId },
    include: { mediaAsset: true },
  });
  assert(version !== null && version.mediaAsset.projectId === projectId, "Media version not found.");

  // Not a general project-visibility check — this is "did you (or staff,
  // for cleanup) actually perform this specific upload," which is a
  // narrower question than "can you see this project."
  assert(
    version.uploadedById === actor.id || actor.role === "org_admin" || actor.role === "account_manager",
    "You don't have permission to confirm this upload."
  );

  const updated = await db.mediaVersion.update({
    where: { id: versionId },
    data: { status: input.status, checksum: input.checksum ?? version.checksum },
  });

  if (input.status === "ready") {
    await db.mediaAsset.update({ where: { id: version.mediaAssetId }, data: { currentVersionId: version.id } });
  }

  await recordAudit({
    userId: actor.id,
    organizationId: project.organizationId,
    clientId: project.clientId,
    action: "media.upload_confirmed",
    resourceType: "media_version",
    resourceId: versionId,
    metadata: { status: input.status },
    ipAddress,
  });

  return updated;
}

export async function listProjectMedia(
  actor: SessionUser,
  projectId: string,
  filters?: { kind?: "source" | "draft" | "final" }
) {
  const project = await loadProjectForMedia(projectId);
  assert(canViewProject(actor, toScope(project)), "You don't have permission to view this project.");

  const assets = await db.mediaAsset.findMany({
    where: { projectId, archivedAt: null, ...(filters?.kind ? { kind: filters.kind } : {}) },
    include: { versions: { orderBy: { versionNumber: "desc" } }, currentVersion: true },
    orderBy: { createdAt: "desc" },
  });

  // Row-level filter, same principle as canViewComment's internal/
  // client_facing split: source footage never reaches a client regardless
  // of what the caller's UI does or doesn't render.
  return actor.role === "client" ? assets.filter((a) => a.kind !== "source") : assets;
}

export async function getMediaDownloadUrl(actor: SessionUser, projectId: string, versionId: string) {
  const project = await loadProjectForMedia(projectId);

  const version = await db.mediaVersion.findFirst({
    where: { id: versionId },
    include: { mediaAsset: true },
  });
  assert(version !== null && version.mediaAsset.projectId === projectId, "Media version not found.");
  assert(
    canViewMediaAsset(actor, toScope(project), version.mediaAsset.kind),
    "You don't have permission to view this media."
  );

  const url = await createPresignedDownloadUrl(version.storageKey);
  return { url, filename: version.filename };
}
