import { describe, it, expect } from "vitest";
import { buildStorageKey } from "@/lib/storage";
import { initiateMediaUploadSchema, confirmMediaUploadSchema } from "@/lib/validation/media";
import { isAllowedMediaMimeType, MEDIA_MAX_FILE_SIZE_BYTES } from "@/lib/constants";

describe("buildStorageKey", () => {
  const base = {
    organizationId: "org-1",
    clientId: "client-1",
    projectId: "project-1",
    kind: "draft" as const,
    versionNumber: 2,
    filename: "final cut v2.mp4",
  };

  it("follows the org/client/project/kind/vN-filename layout documented on MediaVersion.storageKey", () => {
    const key = buildStorageKey(base);
    expect(key).toBe("org/org-1/client/client-1/project/project-1/draft/v2-final_cut_v2.mp4");
  });

  it("strips path separators from the filename so it can't escape its key segment", () => {
    const key = buildStorageKey({ ...base, filename: "../../etc/passwd" });
    // No "/" survives inside the filename portion, so "../.." can never
    // function as a directory-traversal segment — dots themselves are kept
    // (legitimate filenames need them for extensions), just not slashes.
    const filenamePortion = key.split("/").pop()!;
    expect(filenamePortion).not.toContain("/");
    expect(key.split("/")).toHaveLength(8); // org/id/client/id/project/id/kind/vN-filename — unchanged segment count
  });

  it("produces distinct keys for different version numbers on the same asset", () => {
    const v1 = buildStorageKey({ ...base, versionNumber: 1 });
    const v2 = buildStorageKey({ ...base, versionNumber: 2 });
    expect(v1).not.toBe(v2);
  });
});

describe("isAllowedMediaMimeType", () => {
  it("accepts video, audio, and image MIME types", () => {
    expect(isAllowedMediaMimeType("video/mp4")).toBe(true);
    expect(isAllowedMediaMimeType("audio/wav")).toBe(true);
    expect(isAllowedMediaMimeType("image/png")).toBe(true);
  });

  it("rejects unrelated MIME types", () => {
    expect(isAllowedMediaMimeType("application/pdf")).toBe(false);
    expect(isAllowedMediaMimeType("text/plain")).toBe(false);
  });
});

describe("MEDIA_MAX_FILE_SIZE_BYTES", () => {
  it("defines a positive limit for every MediaKind", () => {
    for (const kind of ["source", "draft", "final"] as const) {
      expect(MEDIA_MAX_FILE_SIZE_BYTES[kind]).toBeGreaterThan(0);
    }
  });
});

describe("initiateMediaUploadSchema", () => {
  const valid = {
    kind: "draft",
    filename: "cut.mp4",
    fileType: "video/mp4",
    fileSizeBytes: 1024,
  };

  it("accepts a well-formed input without an assetId (new asset)", () => {
    expect(initiateMediaUploadSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a well-formed input with an assetId (new version)", () => {
    expect(initiateMediaUploadSchema.safeParse({ ...valid, assetId: "asset-1" }).success).toBe(true);
  });

  it("rejects an invalid kind", () => {
    expect(initiateMediaUploadSchema.safeParse({ ...valid, kind: "raw" }).success).toBe(false);
  });

  it("rejects a non-positive file size", () => {
    expect(initiateMediaUploadSchema.safeParse({ ...valid, fileSizeBytes: 0 }).success).toBe(false);
  });
});

describe("confirmMediaUploadSchema", () => {
  it("defaults status to ready when omitted", () => {
    const result = confirmMediaUploadSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("ready");
  });

  it("accepts an explicit failed status with no checksum", () => {
    expect(confirmMediaUploadSchema.safeParse({ status: "failed" }).success).toBe(true);
  });
});
