import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { MediaKind } from "@prisma/client";

const UPLOAD_URL_TTL_SECONDS = 15 * 60; // 15 minutes to complete a direct-to-R2 PUT
const DOWNLOAD_URL_TTL_SECONDS = 10 * 60;

// Lazy singleton, same reasoning as db.ts's PrismaClient: constructed once,
// not on every call, but not at module-import time either — importing this
// file (e.g. transitively, in a test) shouldn't require R2 env vars to be
// set if nothing in that test path actually calls the client.
let client: S3Client | undefined;

function getR2Client(): S3Client {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID is not set.");
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
  return client;
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set.");
  return bucket;
}

/**
 * The storage key convention documented on MediaVersion.storageKey in
 * schema.prisma: org/{orgId}/client/{clientId}/project/{projectId}/...
 * Pure and DB-free on purpose — see tests/media.test.ts — so the layout can
 * be verified without touching R2 or the database.
 */
export function buildStorageKey(params: {
  organizationId: string;
  clientId: string;
  projectId: string;
  kind: MediaKind;
  versionNumber: number;
  filename: string;
}): string {
  const safeFilename = params.filename
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_") // strip path separators and anything that isn't a safe filename char
    .slice(-150); // keep the tail (extension survives) if an absurdly long name comes through

  return [
    "org",
    params.organizationId,
    "client",
    params.clientId,
    "project",
    params.projectId,
    params.kind,
    `v${params.versionNumber}-${safeFilename}`,
  ].join("/");
}

export async function createPresignedUploadUrl(
  storageKey: string,
  contentType: string
): Promise<{ url: string; expiresAt: Date }> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
    ContentType: contentType,
  });
  const url = await getSignedUrl(getR2Client(), command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
  return { url, expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000) };
}

export async function createPresignedDownloadUrl(storageKey: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getBucketName(), Key: storageKey });
  return getSignedUrl(getR2Client(), command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
}

export async function deleteStorageObject(storageKey: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: getBucketName(), Key: storageKey });
  await getR2Client().send(command);
}
