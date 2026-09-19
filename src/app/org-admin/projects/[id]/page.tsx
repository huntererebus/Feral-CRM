import { requireSession } from "@/lib/session";
import { getProject } from "@/lib/services/projects";
import { listOrgMembers } from "@/lib/services/users";
import { PROJECT_STATUS_TRANSITIONS } from "@/lib/project-status";
import { ForbiddenError, type ProjectScope } from "@/lib/rbac";
import { ProjectStatusStepper } from "@/components/project-status-stepper";
import { Panel, PanelHeader, PanelBody } from "@/components/ui/panel";
import { StatusForm } from "./status-form";
import { AssignEditorForm } from "./assign-editor-form";
import { RequirementsForm } from "./requirements-form";
import { MembersPanel } from "./members-panel";
import { ReviewPanel } from "./review-panel";
import { MediaSection } from "./media-section";
import { MessagesPanel } from "./messages-panel";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { user, organizationId } = await requireSession();

  let project: Awaited<ReturnType<typeof getProject>>;
  try {
    project = await getProject(user, params.id);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return <p className="text-sm text-neutral-500">You don&apos;t have access to this project.</p>;
    }
    throw err;
  }

  const nextStatuses = (PROJECT_STATUS_TRANSITIONS[project.status] ?? []).map((t) => t.to);
  const canManage = user.role === "org_admin" || user.role === "account_manager";

  const scope: ProjectScope = {
    organizationId: project.organizationId,
    clientId: project.clientId,
    accountManagerId: project.accountManagerId,
    editorId: project.editorId,
    memberUserIds: project.members.map((m) => m.userId),
  };

  // Only fetched for staff who can actually act on these — a client or an
  // editor without manage rights never needs the org's member directory.
  const [editors, allMembers] = canManage && organizationId
    ? await Promise.all([
        listOrgMembers(user, organizationId, { role: "editor" }),
        listOrgMembers(user, organizationId),
      ])
    : [[], []];

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-100">{project.name}</h1>
        <p className="text-sm text-neutral-500">
          {project.client.name} <span className="mx-1.5 font-mono text-neutral-700">·</span>
          <span className="font-mono">{project.priority}</span> priority
        </p>
      </div>

      <Panel>
        <PanelBody>
          <ProjectStatusStepper status={project.status} />
        </PanelBody>
      </Panel>

      <ReviewPanel projectId={project.id} status={project.status} user={user} scope={scope} />

      {nextStatuses.length > 0 && (
        <Panel>
          <PanelHeader>
            <h2 className="text-sm font-medium text-neutral-300">Move status</h2>
          </PanelHeader>
          <PanelBody>
            <StatusForm projectId={project.id} nextStatuses={nextStatuses} />
          </PanelBody>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        <div className="flex flex-col gap-6">
          {canManage && (
            <Panel>
              <PanelHeader>
                <h2 className="text-sm font-medium text-neutral-300">Editor</h2>
              </PanelHeader>
              <PanelBody>
                <p className="mb-2 text-sm text-neutral-500">
                  Currently: <span className="text-neutral-300">{project.editor?.name ?? "Unassigned"}</span>
                </p>
                <AssignEditorForm projectId={project.id} editors={editors} />
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHeader>
              <h2 className="text-sm font-medium text-neutral-300">Members</h2>
            </PanelHeader>
            <PanelBody>
              <MembersPanel
                projectId={project.id}
                members={project.members.map((m) => ({
                  userId: m.userId,
                  name: m.user.name,
                  roleOnProject: m.roleOnProject,
                }))}
                canManage={canManage}
                directory={allMembers}
              />
            </PanelBody>
          </Panel>
        </div>

        {canManage && (
          <Panel>
            <PanelHeader>
              <h2 className="text-sm font-medium text-neutral-300">Requirements</h2>
            </PanelHeader>
            <PanelBody>
              <RequirementsForm projectId={project.id} requirements={project.requirements} />
            </PanelBody>
          </Panel>
        )}
      </div>

      <MediaSection projectId={project.id} user={user} scope={scope} />

      <MessagesPanel projectId={project.id} user={user} scope={scope} />
    </div>
  );
}
