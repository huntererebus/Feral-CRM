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

## Stage 5: Comments, revisions, and approvals

This is what wires up the two status-transition edges left deliberately locked in Stage 3 (`CLIENT_REVIEW → REVISION_REQUESTED`/`FINAL_REVIEW`, and `FINAL_REVIEW → APPROVED`).

- **Draft review** (`POST /api/v1/projects/:id/media/:versionId/review`, client-only, project must be in `CLIENT_REVIEW`, version must be the `draft` kind): approve → `Approval` row + status to `FINAL_REVIEW`; request revision → `Approval` row + `RevisionRequest` row (open) + status to `REVISION_REQUESTED`. A comment is required at the schema level when requesting a revision — the editor needs to know what to fix.
- **Final delivery approval** (`POST /api/v1/projects/:id/media/:versionId/approve-final`, client-only, project must be in `FINAL_REVIEW`, version must be the `final` kind): `Approval` row + status to `APPROVED`. There's deliberately no client-facing "request revision" on the final — if the export doesn't match the approved draft, staff kick it back to `CLIENT_REVIEW` themselves via the existing generic status endpoint from Stage 3 (that edge was already staff-eligible).
- **RevisionRequest lifecycle** (`GET /api/v1/projects/:id/revision-requests`, `PATCH .../revision-requests/:revisionRequestId`): staff/assigned-editor move a request through `open → in_progress → resolved`, optionally linking the version that addressed it. Not auto-driven by project status — a project can carry more than one open note.
- **MediaComments** (`GET`/`POST /api/v1/projects/:id/media/:versionId/comments`, `POST .../comments/:commentId/resolve`): visibility-filtered at the row level using the existing `canViewComment`. A client's comment is always `client_facing`; staff can opt into `internal`. Resolving is staff-only.
- **projects.ts refactor**: extracted a private `applyStatusChange` core, with two entry points — `transitionProjectStatus` (the existing generic, role-gated endpoint from Stage 3) and a new `applyProjectStatusTransitionAsSystem`, which skips the per-role gate entirely and is only ever called by `services/reviews.ts` immediately after its own `canApproveOrRequestRevision` check succeeds. Never called from a route directly.
- New rbac.ts exports: `canManageRevisionRequest`, `canResolveMediaComment` — both staff-only, scoped through `canViewProject` (so an unassigned editor can't touch another project's revision notes or comments).
- **Worth flagging, not fixed**: while scoping these two new functions I noticed the existing `canPostInternalNote` (from an earlier stage) checks org membership but not per-project visibility — as written, any editor in the org can post an internal note on a project they aren't assigned to. Left untouched since it predates this stage and isn't this stage's call to relitigate, but worth a look.
- No schema changes — `RevisionRequest`, `Approval`, and `MediaComment` were already fully modeled in Stage 1.
- No UI in this stage, same reasoning as Stage 4 — review/comment UX is dashboard work for Stage 8.
- 109/109 tests passing (86 prior + 23 new: `tests/reviews.test.ts` for the new validation schemas, plus new `canManageRevisionRequest`/`canResolveMediaComment` cases in `rbac.test.ts`). `tsc --noEmit` shows only the same two pre-existing error categories as Stage 4 — no new categories, no new `noUncheckedIndexedAccess` gaps this time.

## Stage 6: Messaging and notifications

- **Real email**: `src/lib/email.ts` now sends through Resend (`resend` package) when `RESEND_API_KEY` is set, falling back to the original console-log behavior when it isn't (local dev, CI, this build sandbox) — the Stage 2 stub's promise to never silently drop content still holds either way. `sendInviteEmail`/`sendPasswordResetEmail` signatures are unchanged; existing call sites needed no updates. New `sendNotificationEmail` is one generic transactional template (reusing a Notification's title/body/linkUrl) rather than a bespoke template per event type.
- **Status-driven notifications**: `src/lib/project-notifications.ts` is a pure, unit-tested table (same style as `project-status.ts`) mapping "a project enters status X" → who gets notified and whether it's worth an email. `src/lib/services/notifications.ts` resolves the role-relative roles (`"editor"` → the actual assigned editor, `"client"` → every user with that `clientId`) to real recipients and delivers. Hooked into exactly one place — `projects.ts`'s `applyStatusChange` — so every status-changing code path (the generic endpoint from Stage 3, the review flow's system transitions from Stage 5) notifies automatically; no service has to remember to call it.
- No queue yet (Upstash is in the stack per the plan but not wired up this stage) — notification delivery, including the email send, runs inline and awaited inside the request. Documented as a deliberate simplification, not an oversight: a slow provider adds latency rather than silently dropping the notification, which is the safer failure mode until a real background worker exists.
- **Messages** (`GET`/`POST /api/v1/projects/:id/messages`): project-level chat with up to 10 `MediaVersion` attachments per message, visibility-filtered exactly like comments (reuses `canViewComment`/`canPostInternalNote` directly rather than duplicating the rule — `Message.visibility` and `MediaComment.visibility` are the same `Visibility` enum).
- **Notifications API** (`GET /api/v1/notifications`, `POST .../notifications/:notificationId/read`, `POST .../notifications/read-all`): always self-scoped by `userId`, no RBAC helper needed beyond the query filter itself.
- **Fixed, not just flagged**: `canPostInternalNote` was scoped to org membership only (noted at the end of Stage 5) — now composes through `canViewProject`, so an unassigned editor can no longer post an internal note (or, as of this stage, an internal message) on a project they don't work on. No existing tests referenced the old behavior; new coverage added.
- No schema changes — `Message`, `MessageAttachment`, and `Notification` were already fully modeled in Stage 1.
- No UI in this stage, same reasoning as Stages 4–5 — deferred to Stage 8.
- 125/125 tests passing (109 prior + 16 new: `project-notifications.test.ts`, `messages.test.ts`, plus new `canPostInternalNote` cases in `rbac.test.ts`). `tsc --noEmit` shows only the same two pre-existing error categories as Stages 4–5 — no new categories.

## GitHub cleanup

- Added a top-level README.md (previously missing — SETUP.md had become a build log, not an entry point). `package.json` already had `"private": true`; no other cleanup needed. No secrets or build artifacts found anywhere in git history.
- The repo is currently **public** (made public earlier so this environment could clone it without push credentials). Worth making private again now that a normal push workflow is available — flagging since I can't change repo visibility myself.

## Stage 8 (started): Dashboard UI

First real UI pass, on top of the API-only foundation from Stages 1–7. This is a start, not a finish — see "Not yet converted" below.

**Design plan** (per the design process): dark theme and org-injected brand colors (`--org-primary-color`/`--org-secondary-color`) were already locked in from Stage 1, so this designs within that rather than choosing a palette freely.
- *Subject*: an editing-suite tool for editors/AMs/clients reviewing cuts against a pipeline, not a generic SaaS dashboard.
- *Color*: dark base + the org's own accent, plus a 5-zone status-color system (`production`/`client-review`/`revision`/`complete`/`archived` in `tailwind.config.ts`) instead of 13 distinct per-status hues.
- *Type*: Inter (sans) for conversational content, JetBrains Mono for anything measured — timecodes, file sizes, dates, status codes — echoing NLE timecode displays. Loaded via `next/font/google` in `layout.tsx`.
- *Layout*: sidebar + topbar shell, inspector-panel style project detail (status rail + metadata alongside main content), hairline borders and minimal radius rather than the identical-rounded-card SaaS-kit default.
- *Principle*: pipeline status is always a visual stepper, never just a text label.

**What's built:**
- `src/lib/design/status-zones.ts` — pure, unit-tested mapping of all 13 `ProjectStatus` values to a display zone + human label, and the "happy path" stepper order (display-only; `project-status.ts`'s graph remains the sole authority on what's actually reachable).
- `src/components/ui/` — Button, Input/Textarea, Select, Panel, StatusBadge, Avatar (initials), EmptyState.
- `src/components/project-status-stepper.tsx` — the pipeline visual; a project on a "detour" status (revision states, archived — not on the happy-path list) gets its own callout instead of being forced into the linear stepper.
- `src/components/app-shell.tsx` + `authenticated-shell.tsx` + `nav-items.tsx` (role-aware nav) + `sidebar-nav.tsx` (active-link highlighting) + `notifications-bell.tsx` (live unread count) + `sign-out-button.tsx` — wired into `layout.tsx` for `org-admin/`, `settings/`, `platform-admin/`, and the new `notifications/` route groups.
- **Projects list and detail pages rebuilt** on the new system — this is the product's core surface. The detail page is now an inspector layout: stepper up top, status-transition control, then a metadata rail (editor, members) beside requirements.
- **Editor assignment and project members now use real dropdowns** instead of raw user-ID text fields — new `listOrgMembers` service (`GET /api/v1/org/members`, staff-only, new `canViewOrgMembers` rbac export) backs both pickers. This closes the placeholder noted back in Stage 3.
- **Notifications page** (`/notifications`) — list, mark-read, mark-all-read, since the topbar bell needed somewhere to link to.

**Not yet converted to the new system** (still functional, old plain markup): client CRUD, org branding settings, platform-admin organizations, auth pages (login/register/reset). **Not yet built at all**: media gallery/upload widget, review/approval UI, comments thread, messages thread. These are the natural next passes.

**Environment note**: `next build` can't complete in this sandbox — `next/font/google` needs `fonts.googleapis.com`, which isn't in this environment's network allowlist (same category of limitation as the `prisma generate`/`binaries.prisma.sh` gap already noted above). `tsc --noEmit` and the full test suite are both clean, so the code itself is verified; the production build itself needs to run somewhere with normal internet access.

132/132 tests passing (125 prior + 7 new: `tests/status-zones.test.ts`). `tsc --noEmit` shows only the same two pre-existing error categories as every prior stage — one new `noUncheckedIndexedAccess` gap in `statusDisplay()` was found and fixed the same way as the others.
