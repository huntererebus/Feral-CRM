// Reserved subdomains that can never be claimed as an organization slug.
// Single source of truth, imported by:
//   - src/middleware.ts (fast, edge-level rejection of these as tenant hosts)
//   - src/lib/services/organizations.ts (authoritative check at org-creation time)
// Keeping this in one place means the two checks can't drift apart.
import type { MediaKind } from "@prisma/client";

export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "platform-admin",
  "static",
  "assets",
  "cdn",
  "mail",
  "support",
  "docs",
  "status",
  "blog",
]);

export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// --- Media upload limits ----------------------------------------------------
// Kept here rather than inline in storage.ts/media.ts so the limits are one
// glance away from the slug rules above, and so validation (schemas) and the
// service layer both read the same numbers instead of duplicating them.

export const MEDIA_MAX_FILE_SIZE_BYTES: Record<MediaKind, number> = {
  source: 5 * 1024 * 1024 * 1024, // 5 GB — raw camera/audio footage
  draft: 2 * 1024 * 1024 * 1024, // 2 GB — working cuts
  final: 2 * 1024 * 1024 * 1024, // 2 GB — delivered exports
};

// Prefix match, not an exact-type allowlist — clients and editors use a wide
// range of camera/export codecs and this isn't the layer that should reject
// a legitimate file over an unrecognized-but-valid video/* subtype.
export const MEDIA_ALLOWED_MIME_PREFIXES = ["video/", "audio/", "image/"];

export function isAllowedMediaMimeType(mimeType: string): boolean {
  return MEDIA_ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}
