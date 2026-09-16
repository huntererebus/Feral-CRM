import { z } from "zod";

export const mediaKindSchema = z.enum(["source", "draft", "final"]);

export const initiateMediaUploadSchema = z.object({
  kind: mediaKindSchema,
  // Omit to start a brand-new deliverable slot (e.g. a new raw clip, or the
  // first cut of a draft). Pass an existing asset's id to upload the next
  // *version* of it instead (e.g. a revised draft after client feedback) —
  // see services/media.ts's initiateMediaUpload for the branching logic.
  assetId: z.string().min(1).optional().nullable(),
  filename: z.string().min(1).max(255),
  fileType: z.string().min(1).max(255),
  fileSizeBytes: z.coerce.number().int().positive(),
});

export const confirmMediaUploadSchema = z.object({
  status: z.enum(["ready", "failed"]).default("ready"),
  checksum: z.string().max(128).optional().nullable(),
});
