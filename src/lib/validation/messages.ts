import { z } from "zod";
import { commentVisibilitySchema } from "@/lib/validation/reviews";

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  // Same per-role defaulting as createCommentSchema: omit to default
  // client_facing; staff may opt into internal.
  visibility: commentVisibilitySchema.optional(),
  attachmentVersionIds: z.array(z.string().min(1)).max(10).optional(),
});
