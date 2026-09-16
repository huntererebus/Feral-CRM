import { z } from "zod";

const PROJECT_STATUS_VALUES = [
  "NEW",
  "UPLOADED",
  "AWAITING_ASSIGNMENT",
  "ASSIGNED",
  "IN_EDITING",
  "INTERNAL_REVIEW",
  "CLIENT_REVIEW",
  "REVISION_REQUESTED",
  "REVISION_IN_PROGRESS",
  "FINAL_REVIEW",
  "APPROVED",
  "COMPLETED",
  "ARCHIVED",
] as const;

export const projectStatusSchema = z.enum(PROJECT_STATUS_VALUES);

export const createProjectSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  contentType: z.string().max(100).optional().nullable(),
  platform: z.string().max(100).optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  accountManagerId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  contentType: z.string().max(100).optional().nullable(),
  platform: z.string().max(100).optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  accountManagerId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const assignEditorSchema = z.object({
  editorId: z.string().min(1),
});

export const transitionProjectStatusSchema = z.object({
  toStatus: projectStatusSchema,
});

export const upsertProjectRequirementsSchema = z.object({
  aspectRatio: z.string().max(20).optional().nullable(),
  resolution: z.string().max(20).optional().nullable(),
  durationSeconds: z.coerce.number().int().positive().optional().nullable(),
  captionRequirements: z.string().max(2000).optional().nullable(),
  hashtags: z.array(z.string().max(100)).max(50).optional(),
  musicRequirements: z.string().max(2000).optional().nullable(),
  brandRequirements: z.string().max(2000).optional().nullable(),
  targetPostingDate: z.coerce.date().optional().nullable(),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1),
  roleOnProject: z.enum(["account_manager", "editor", "observer"]),
});
