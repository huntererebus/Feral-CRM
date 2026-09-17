import { z } from "zod";

export const commentVisibilitySchema = z.enum(["client_facing", "internal"]);

export const createCommentSchema = z.object({
  body: z.string().min(1).max(5000),
  timestampSeconds: z.coerce.number().int().nonnegative().optional().nullable(),
  // Omit to default per-role (client_facing for a client, client_facing for
  // staff too unless they explicitly ask for internal) — see
  // services/comments.ts's addComment for the exact default logic.
  visibility: commentVisibilitySchema.optional(),
});

export const reviewDecisionSchema = z
  .object({
    decision: z.enum(["approved", "revision_requested"]),
    comment: z.string().max(5000).optional().nullable(),
  })
  .refine((v) => v.decision !== "revision_requested" || Boolean(v.comment?.trim()), {
    message: "A comment is required when requesting a revision.",
    path: ["comment"],
  });

export const finalApprovalSchema = z.object({
  comment: z.string().max(5000).optional().nullable(),
});

export const resolveRevisionRequestSchema = z.object({
  status: z.enum(["in_progress", "resolved"]),
  resolvedByVersionId: z.string().min(1).optional().nullable(),
});
