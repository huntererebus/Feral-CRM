# Reel — Stage 1 Setup (Foundation)

What's in this stage: database schema, Auth.js credentials login, subdomain
resolution middleware, RBAC module, invite/reset flows. No UI beyond a
placeholder shell — dashboards and project screens start in the next stage.

## 1. Install dependencies

```bash
npm install
```

## 2. Environment variables

```bash
cp .env.example .env
```

Fill in at minimum:
- `DATABASE_URL` — a Postgres connection string (Neon's free tier works well for local/dev — see planning-doc.md Section 9)
- `AUTH_SECRET` — generate with `npx auth secret`

Leave `R2_*` and `RESEND_API_KEY` blank for now — those are wired in during the media and notifications stages.

## 3. Generate the Prisma client and run migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

**Note on this sandbox:** I built and reviewed this code in an environment whose network allowlist doesn't include `binaries.prisma.sh`, so I couldn't actually run `prisma generate` here. As of Stage 2, `npx tsc --noEmit` shows seven errors, all downstream of the same root cause: three "no exported member" errors for Prisma-generated types (`Role`, `Organization` in two places), plus four "implicitly has an 'any' type" errors on callback parameters (`tx`, `client`, `org`) that TypeScript can only infer once the generated client types exist. Everything else type-checks cleanly, and the full test suite (43 tests) passes since Vitest transpiles rather than type-checks — none of the tests touch the database. Run the two commands above in your own environment and all seven errors resolve; I'd still recommend `npx tsc --noEmit` afterward as a sanity check before moving on.

## 4. Seed local dev data

```bash
npx tsx prisma/seed.ts
```

This creates a platform admin, one sample agency ("Acme Media Co.", slug `acme`), an org admin, account manager, editor, a client org ("Northwind Boutique"), a client user, and one sample project. Credentials are printed to the console when the script runs.

## 5. Local subdomain routing

Most browsers resolve `*.localhost` without any `/etc/hosts` changes. Run:

```bash
npm run dev
```

Then visit:
- `http://localhost:3000` — base domain (platform-admin/marketing surface)
- `http://acme.localhost:3000` — the seeded agency's portal

If your browser doesn't resolve `*.localhost` subdomains, add entries to `/etc/hosts`:
```
127.0.0.1 acme.localhost
```

## 6. Run tests

```bash
npm test
```

Covers RBAC (cross-org and cross-client isolation, editor/client/staff scoping) and subdomain-slug extraction. These are pure unit tests with no database dependency, so they run the same in CI as locally.

## 7. Row-Level Security (do not apply yet)

`prisma/rls.sql` contains the third isolation layer's policies but is **not** meant to be applied yet — it depends on session-variable plumbing (`SET LOCAL app.current_organization_id`) that lands in the hardening stage (Stage 11 in the MVP plan), so that the policy set and the code that sets those variables ship together and can be tested as one unit. Applying it now would make every query return zero rows.

## Stage 2 additions (this update)

- **Service layer** (`src/lib/services/*`): the actual business logic — auth checks, DB calls, audit logging — for organizations, clients/contacts, and user invites. API routes and server-rendered pages both call into this layer rather than duplicating logic.
- **Validation layer** (`src/lib/validation/*`): Zod schemas pulled out of the service files so they have zero dependency on Prisma/the database — this is what lets `tests/schemas.test.ts` run without a DB connection.
- **Platform admin**: create/list agencies (`/api/v1/platform/organizations`), each creation atomically invites the first org_admin. Minimal UI at `/platform-admin/organizations`.
- **Org branding settings**: `/api/v1/org/settings`, UI at `/settings/organization` (org_admin only to write, any org member to read — it's what renders their own shell).
- **Client CRUD + contacts**: `/api/v1/clients`, `/api/v1/clients/:id`, `/api/v1/clients/:id/contacts`. Soft-delete only (`archiveClient`), consistent with the audit/legal-hold reasoning in the planning doc. Minimal UI at `/org-admin/clients`.
- **User invites**: `/api/v1/users/invite` — org_admin can invite any in-org role, account managers can invite client users only. Shares the same token/email plumbing built in Stage 1.
- **Shared plumbing added this stage**: `src/lib/api-response.ts` (consistent success/error envelope + error-to-status-code mapping across every route), `src/lib/audit.ts` (single `recordAudit` call site instead of hand-rolled `db.auditLog.create`s), `src/lib/email.ts` (stub layer both the invite and password-reset flows now share).

The UI pages in this stage are deliberately minimal (functional tables and forms, not the polished dashboard) — full dashboard design comes in Stage 8 per the MVP plan, once there's enough real data (projects, media) to actually design a dashboard around.

## What's next (Stage 3)

Projects core: project CRUD, the full status-transition model, `ProjectMember` wiring, and the platform/content requirements sub-form — the last piece of foundation before media upload and the review/approval loop.

## Stage 3: Projects core

- Project CRUD (`/api/v1/projects`, `/api/v1/projects/:id`) — create, list (role-scoped: editors see only their assignments, clients see only their own projects), update, soft-delete.
- Full status-transition model in `src/lib/project-status.ts` — a pure, DB-free directed graph (`PROJECT_STATUS_TRANSITIONS`) covering all 13 `ProjectStatus` values, with per-edge role eligibility. Two groups of edges (the client review decision, and the final QC sign-off) are modeled but left with an empty eligible-roles list on purpose — they're driven by the Approval/RevisionRequest flow landing in a later stage, not this generic endpoint. Unit-tested directly in `tests/project-status.test.ts`, independent of rbac.ts or Prisma.
- Editor assignment (`/api/v1/projects/:id/assign-editor`) — also advances `AWAITING_ASSIGNMENT` → `ASSIGNED` as a side effect.
- Requirements sub-form (`/api/v1/projects/:id/requirements`) — GET/PUT against the existing `ProjectRequirements` model.
- `ProjectMember` wiring (`/api/v1/projects/:id/members`, `/api/v1/projects/:id/members/:userId`) — add/list/remove, org_admin/account_manager only.
- New rbac.ts exports: `canManageProjectDetails`, `canManageProjectRequirements`, `canManageProjectMembers`, `canTransitionProjectStatus` (the last takes the eligible-roles list computed from the graph, then applies the per-resource editor-assignment check).
- Minimal UI at `/org-admin/projects` (list + create) and `/org-admin/projects/:id` (status transition, editor assignment, requirements, members) — same restrained, unstyled-functional pattern as Stage 2; a real picker/dashboard UI is Stage 8 work, so editor/member assignment here takes a raw user ID rather than a populated dropdown.
- No schema changes — `Project`, `ProjectMember`, `ProjectRequirements`, and `ProjectStatus` were already fully modeled in Stage 1's schema.
- 66/66 tests passing (43 prior + 23 new: 12 in `project-status.test.ts`, 11 added to `rbac.test.ts`). `tsc --noEmit` shows the same pre-existing error set as Stage 2 (all downstream of `@prisma/client` not being generated in this sandbox) plus two now-fixed `noUncheckedIndexedAccess` gaps in the new transition-graph lookups — no new error categories introduced.

## Stage 4: Media upload

- Direct-to-R2 presigned upload flow: `POST /api/v1/projects/:id/media` returns a short-lived (15 min) presigned PUT URL; the browser uploads straight to R2, then `POST /api/v1/projects/:id/media/:versionId/confirm` marks the version ready (or failed) and, on success, updates the asset's `currentVersionId`.
- `src/lib/storage.ts` — lazy R2 (S3-compatible) client via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`; `buildStorageKey()` is a pure, unit-tested function implementing the `org/{orgId}/client/{clientId}/project/{projectId}/{kind}/vN-filename` convention already documented on `MediaVersion.storageKey` in the schema.
- Versioning model: omit `assetId` on upload to start a new deliverable slot (new raw clip, or a fresh draft/final); pass an existing `assetId` to add the next version onto it (e.g. a revised draft after feedback). One `MediaAsset` can hold many `MediaVersion`s; `currentVersionId` always points at the latest `ready` one.
- New `MEDIA_MAX_FILE_SIZE_BYTES` / `MEDIA_ALLOWED_MIME_PREFIXES` / `isAllowedMediaMimeType` in `constants.ts`, same single-source-of-truth pattern as `RESERVED_SLUGS`.
- New rbac.ts export: `canViewMediaAsset` — gates by kind only (source footage is never client-visible; draft/final are). Deliberately does **not** gate visibility by project status (e.g. hiding an unfinished draft until it's sent for review) — that's a "when do we expose this version" decision for the Approval flow in a later stage, not a blanket rule here.
- `GET /api/v1/projects/:id/media` (list, role-scoped — clients never see `source`), `GET /api/v1/projects/:id/media/:versionId/download-url` (presigned GET, 10 min).
- No schema changes — `MediaAsset`/`MediaVersion` were already fully modeled in Stage 1.
- No UI in this stage — direct-to-storage upload needs real client-side JS (progress, retry, chunking judgment calls) that's better done once the dashboard design work (Stage 8) sets the actual upload-widget UX, rather than a throwaway version now. The API is fully usable via curl/Postman/a thin script in the meantime.
- 86/86 tests passing (66 prior + 20 new: `tests/media.test.ts` for `buildStorageKey`/mime/schema logic, plus new `canUploadSourceMedia`/`canViewMediaAsset` cases in `rbac.test.ts`). `tsc --noEmit` shows only the pre-existing `@prisma/client`-generation gap plus the same pre-existing implicit-any-from-unresolved-Prisma-types pattern already present in Stage 2/3 files — no new error categories.
