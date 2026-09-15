-- Row-Level Security policies — isolation layer #3 of 3 (planning-doc.md
-- Section 10). Layers #1 and #2 are the subdomain-resolution middleware
-- and the application-layer checks in src/lib/session.ts + src/lib/rbac.ts.
-- This layer exists so that a bug in either of those layers alone cannot,
-- by itself, leak one organization's or client's data to another.
--
-- Run this AFTER `prisma migrate dev` / `prisma migrate deploy` — Prisma
-- does not manage RLS policies, so this is applied as a separate step.
-- See SETUP.md for when/how to run it.
--
-- Approach: the application sets two session-local settings at the start
-- of each request's database transaction (see src/lib/db.ts — extended in
-- a later stage to wrap queries in a `SET LOCAL` transaction once this
-- policy set is enabled): app.current_organization_id and, where relevant,
-- app.current_client_id. Policies compare stored rows against these.
--
-- NOTE: RLS is NOT enabled by default in this Stage 1 migration — it is
-- provided here ready to apply, but turning it on requires wiring the
-- session-variable-setting logic into src/lib/db.ts first (planned for the
-- hardening stage, so query code written in earlier stages doesn't have to
-- be revisited). Applying this file before that wiring exists will cause
-- every query to return zero rows, since the session variables would be
-- unset.

-- Organizations: only visible to platform admins (checked in the app,
-- since "is platform admin" isn't itself a row-scoped property) or to the
-- resolved current organization.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON organizations
  USING (id = current_setting('app.current_organization_id', true)::text);

-- Clients: scoped to organization.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_org_isolation ON clients
  USING (organization_id = current_setting('app.current_organization_id', true)::text);

-- Projects: scoped to organization (client-level narrowing is handled by
-- the application layer per-role, since e.g. account managers see all of
-- their org's projects while editors see only assigned ones — that's a
-- role distinction, not a tenant boundary, so it stays out of RLS).
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_org_isolation ON projects
  USING (organization_id = current_setting('app.current_organization_id', true)::text);

-- Users: scoped to organization, except platform_admin rows (organization
-- id null) which the application layer alone gates.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_org_isolation ON users
  USING (
    organization_id = current_setting('app.current_organization_id', true)::text
    OR organization_id IS NULL
  );

-- Media, comments, messages, tasks, tags, audit_logs, etc. all resolve to
-- an organization via a join (through project or client) rather than
-- carrying organization_id directly in most cases. Postgres RLS policies
-- can reference other tables, so these use a subquery rather than a direct
-- column comparison:

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_asset_org_isolation ON media_assets
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE organization_id = current_setting('app.current_organization_id', true)::text
    )
  );

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_org_isolation ON audit_logs
  USING (
    organization_id = current_setting('app.current_organization_id', true)::text
    OR organization_id IS NULL -- platform-level audit entries; app layer gates visibility
  );

-- Remaining tables (media_versions, revision_requests, approvals,
-- media_comments, messages, tasks, tags, project_tags, client_tags,
-- notifications) follow the same subquery pattern and will be added in
-- the same stage this file gets wired into src/lib/db.ts, so the policy
-- set and the session-variable plumbing land together and can be tested
-- as one unit rather than partially enabled.
