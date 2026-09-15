import { z } from "zod";
import { SLUG_PATTERN } from "@/lib/constants";

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(SLUG_PATTERN, "Slug must be lowercase letters, numbers, and hyphens only"),
  adminEmail: z.string().email(),
  adminName: z.string().min(1).max(200),
});

export const updateOrganizationStatusSchema = z.object({
  status: z.enum(["trial", "active", "suspended"]),
});

export const updateOrgSettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #4f46e5")
    .optional()
    .nullable(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #14b8a6")
    .optional()
    .nullable(),
  faviconUrl: z.string().url().optional().nullable(),
});
