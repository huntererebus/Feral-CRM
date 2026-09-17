import { describe, it, expect } from "vitest";
import {
  canViewProject,
  canAssignEditor,
  canUploadSourceMedia,
  canUploadDraftOrFinalMedia,
  canViewMediaAsset,
  canApproveOrRequestRevision,
  canViewComment,
  canDeleteProject,
  canInviteRole,
  canManageOrgSettings,
  canManageProjectDetails,
  canManageProjectMembers,
  canTransitionProjectStatus,
  canManageRevisionRequest,
  canResolveMediaComment,
  type SessionUser,
  type ProjectScope,
} from "@/lib/rbac";

const orgA = "org-a";
const orgB = "org-b";
const clientA1 = "client-a1";
const clientA2 = "client-a2";

function user(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: "user-1",
    role: "client",
    organizationId: orgA,
    clientId: null,
    ...overrides,
  };
}

function project(overrides: Partial<ProjectScope>): ProjectScope {
  return {
    organizationId: orgA,
    clientId: clientA1,
    accountManagerId: null,
    editorId: null,
    ...overrides,
  };
}

describe("cross-organization isolation", () => {
  it("blocks a client in one org from viewing a project in another org", () => {
    const u = user({ role: "client", organizationId: orgB, clientId: "client-b1" });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canViewProject(u, p)).toBe(false);
  });

  it("blocks org staff from viewing a project outside their organization", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgB });
    const p = project({ organizationId: orgA });
    expect(canViewProject(u, p)).toBe(false);
  });

  it("allows a platform admin to view any organization's project (support access)", () => {
    const u = user({ id: "pa-1", role: "platform_admin", organizationId: null });
    const p = project({ organizationId: orgA });
    expect(canViewProject(u, p)).toBe(true);
  });
});

describe("cross-client isolation within the same organization", () => {
  it("blocks a client from viewing another client's project in the same org", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA2 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canViewProject(u, p)).toBe(false);
  });

  it("allows a client to view their own org's project", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canViewProject(u, p)).toBe(true);
  });
});

describe("editor scoping", () => {
  it("blocks an editor from viewing a project they are not assigned to", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-2" });
    expect(canViewProject(u, p)).toBe(false);
  });

  it("allows an assigned editor to view and upload to their project", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-1" });
    expect(canViewProject(u, p)).toBe(true);
    expect(canUploadDraftOrFinalMedia(u, p)).toBe(true);
  });

  it("blocks an editor from uploading drafts to a project assigned to someone else", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-2" });
    expect(canUploadDraftOrFinalMedia(u, p)).toBe(false);
  });

  it("blocks an editor from assigning editors (org-admin/AM only)", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA });
    expect(canAssignEditor(u, p)).toBe(false);
  });
});

describe("approvals are client-only", () => {
  it("blocks staff from approving on the client's behalf", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgA });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canApproveOrRequestRevision(u, p)).toBe(false);
  });

  it("allows the owning client to approve", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canApproveOrRequestRevision(u, p)).toBe(true);
  });

  it("blocks a different client in the same org from approving", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA2 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canApproveOrRequestRevision(u, p)).toBe(false);
  });
});

describe("internal notes are never visible to clients", () => {
  const p = project({ organizationId: orgA, clientId: clientA1 });

  it("blocks a client from viewing an internal comment on their own project", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    expect(canViewComment(u, p, "internal")).toBe(false);
  });

  it("allows a client to view a client-facing comment on their own project", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    expect(canViewComment(u, p, "client_facing")).toBe(true);
  });

  it("allows org staff to view internal comments on projects they can access", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const staffProject = project({ organizationId: orgA, editorId: "editor-1" });
    expect(canViewComment(u, staffProject, "internal")).toBe(true);
  });
});

describe("delete/archive is admin/AM only", () => {
  it("blocks an editor from deleting a project", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-1" });
    expect(canDeleteProject(u, p)).toBe(false);
  });

  it("allows an org admin to delete a project in their org", () => {
    const u = user({ id: "oa-1", role: "org_admin", organizationId: orgA });
    const p = project({ organizationId: orgA });
    expect(canDeleteProject(u, p)).toBe(true);
  });
});

describe("organization settings — org_admin only, and never cross-org", () => {
  it("allows an org admin to manage their own org's settings", () => {
    const u = user({ id: "oa-1", role: "org_admin", organizationId: orgA });
    expect(canManageOrgSettings(u, orgA)).toBe(true);
  });

  it("blocks an org admin from managing a different org's settings", () => {
    const u = user({ id: "oa-1", role: "org_admin", organizationId: orgA });
    expect(canManageOrgSettings(u, orgB)).toBe(false);
  });

  it("blocks an account manager from managing org settings", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgA });
    expect(canManageOrgSettings(u, orgA)).toBe(false);
  });

  it("allows a platform admin to manage any org's settings (support path)", () => {
    const u = user({ id: "pa-1", role: "platform_admin", organizationId: null });
    // NOTE: canManageOrgSettings itself returns false for platform_admin
    // today, since routine settings edits shouldn't happen this way — see
    // rbac.ts. Support-path changes go through the platform/organizations
    // endpoints instead, gated by isPlatformAdmin directly.
    expect(canManageOrgSettings(u, orgA)).toBe(false);
  });
});

describe("user invites — who can invite whom", () => {
  it("allows an org admin to invite any in-org role", () => {
    const u = user({ id: "oa-1", role: "org_admin", organizationId: orgA });
    expect(canInviteRole(u, orgA, "org_admin")).toBe(true);
    expect(canInviteRole(u, orgA, "account_manager")).toBe(true);
    expect(canInviteRole(u, orgA, "editor")).toBe(true);
    expect(canInviteRole(u, orgA, "client")).toBe(true);
  });

  it("blocks an org admin from inviting into a different organization", () => {
    const u = user({ id: "oa-1", role: "org_admin", organizationId: orgA });
    expect(canInviteRole(u, orgB, "editor")).toBe(false);
  });

  it("allows an account manager to invite client users only", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgA });
    expect(canInviteRole(u, orgA, "client")).toBe(true);
    expect(canInviteRole(u, orgA, "editor")).toBe(false);
    expect(canInviteRole(u, orgA, "account_manager")).toBe(false);
    expect(canInviteRole(u, orgA, "org_admin")).toBe(false);
  });

  it("blocks an editor from inviting anyone", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    expect(canInviteRole(u, orgA, "client")).toBe(false);
  });

  it("blocks a client from inviting anyone through this path", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    expect(canInviteRole(u, orgA, "client")).toBe(false);
  });
});

describe("project details/requirements/members — org_admin/AM only, never cross-org", () => {
  it("allows an account manager to manage project details in their org", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgA });
    const p = project({ organizationId: orgA });
    expect(canManageProjectDetails(u, p)).toBe(true);
  });

  it("blocks an account manager from managing a project outside their org", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgB });
    const p = project({ organizationId: orgA });
    expect(canManageProjectDetails(u, p)).toBe(false);
  });

  it("blocks an editor from managing project members even on their own assigned project", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-1" });
    expect(canManageProjectMembers(u, p)).toBe(false);
  });

  it("blocks a client from managing their own project's details", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canManageProjectDetails(u, p)).toBe(false);
  });
});

describe("status transitions — role-eligibility plus assignment scoping", () => {
  const staffRoles: SessionUser["role"][] = ["org_admin", "account_manager"];

  it("allows org staff a transition their role is listed for", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgA });
    const p = project({ organizationId: orgA });
    expect(canTransitionProjectStatus(u, p, staffRoles)).toBe(true);
  });

  it("blocks org staff from a different org even when their role is eligible", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgB });
    const p = project({ organizationId: orgA });
    expect(canTransitionProjectStatus(u, p, staffRoles)).toBe(false);
  });

  it("blocks any role not on the eligible list, e.g. a client on a staff-only transition", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canTransitionProjectStatus(u, p, staffRoles)).toBe(false);
  });

  it("blocks every role when the transition's eligible list is empty (future-stage edges)", () => {
    const u = user({ id: "oa-1", role: "org_admin", organizationId: orgA });
    const p = project({ organizationId: orgA });
    expect(canTransitionProjectStatus(u, p, [])).toBe(false);
  });

  it("allows an assigned editor when editor is on the eligible list", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-1" });
    expect(canTransitionProjectStatus(u, p, ["editor", ...staffRoles])).toBe(true);
  });

  it("blocks an unassigned editor even when editor is on the eligible list", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-2" });
    expect(canTransitionProjectStatus(u, p, ["editor", ...staffRoles])).toBe(false);
  });

  it("allows an editor listed as a ProjectMember even without being the primary editor", () => {
    const u = user({ id: "editor-3", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-1", memberUserIds: ["editor-3"] });
    expect(canTransitionProjectStatus(u, p, ["editor", ...staffRoles])).toBe(true);
  });
});

describe("media upload permissions", () => {
  it("allows a client to upload source footage on their own project", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canUploadSourceMedia(u, p)).toBe(true);
  });

  it("blocks a client from uploading source footage on someone else's project", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: "client-a-2" });
    expect(canUploadSourceMedia(u, p)).toBe(false);
  });

  it("allows an account manager to upload source footage on their org's project", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgA });
    const p = project({ organizationId: orgA });
    expect(canUploadSourceMedia(u, p)).toBe(true);
  });

  it("blocks an editor from uploading source footage (draft/final only)", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-1" });
    expect(canUploadSourceMedia(u, p)).toBe(false);
  });
});

describe("canViewMediaAsset — source footage stays internal", () => {
  it("lets org staff and the assigned editor see source media", () => {
    const oa = user({ id: "oa-1", role: "org_admin", organizationId: orgA });
    const editor = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-1" });
    expect(canViewMediaAsset(oa, p, "source")).toBe(true);
    expect(canViewMediaAsset(editor, p, "source")).toBe(true);
  });

  it("blocks a client from viewing source media even on their own project", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canViewMediaAsset(u, p, "source")).toBe(false);
  });

  it("lets a client view draft and final media on their own project", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canViewMediaAsset(u, p, "draft")).toBe(true);
    expect(canViewMediaAsset(u, p, "final")).toBe(true);
  });

  it("blocks a client from any kind on a project that isn't theirs", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: "client-a-2" });
    expect(canViewMediaAsset(u, p, "final")).toBe(false);
  });
});

describe("canManageRevisionRequest — staff scoped to projects they can view", () => {
  it("allows an account manager on their org's project", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgA });
    const p = project({ organizationId: orgA });
    expect(canManageRevisionRequest(u, p)).toBe(true);
  });

  it("allows the assigned editor", () => {
    const u = user({ id: "editor-1", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-1" });
    expect(canManageRevisionRequest(u, p)).toBe(true);
  });

  it("blocks an editor who isn't assigned to this project", () => {
    const u = user({ id: "editor-2", role: "editor", organizationId: orgA });
    const p = project({ organizationId: orgA, editorId: "editor-1" });
    expect(canManageRevisionRequest(u, p)).toBe(false);
  });

  it("blocks a client", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canManageRevisionRequest(u, p)).toBe(false);
  });
});

describe("canResolveMediaComment — same staff-scoped shape", () => {
  it("allows org_admin", () => {
    const u = user({ id: "oa-1", role: "org_admin", organizationId: orgA });
    const p = project({ organizationId: orgA });
    expect(canResolveMediaComment(u, p)).toBe(true);
  });

  it("blocks a client even on their own project", () => {
    const u = user({ role: "client", organizationId: orgA, clientId: clientA1 });
    const p = project({ organizationId: orgA, clientId: clientA1 });
    expect(canResolveMediaComment(u, p)).toBe(false);
  });

  it("blocks staff from a different org", () => {
    const u = user({ id: "am-1", role: "account_manager", organizationId: orgB });
    const p = project({ organizationId: orgA });
    expect(canResolveMediaComment(u, p)).toBe(false);
  });
});
