import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().optional().nullable(),
  accountManagerId: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  status: z.enum(["active", "paused", "archived"]).optional(),
});

export const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  isPrimary: z.boolean().optional(),
});
