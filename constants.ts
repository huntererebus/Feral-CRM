// Reserved subdomains that can never be claimed as an organization slug.
// Single source of truth, imported by:
//   - src/middleware.ts (fast, edge-level rejection of these as tenant hosts)
//   - src/lib/services/organizations.ts (authoritative check at org-creation time)
// Keeping this in one place means the two checks can't drift apart.
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
