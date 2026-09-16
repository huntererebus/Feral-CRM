import { requireSession } from "@/lib/session";
import { getProject } from "@/lib/services/projects";
import { PROJECT_STATUS_TRANSITIONS } from "@/lib/project-status";
import { ForbiddenError } from "@/lib/rbac";
import { StatusForm } from "./status-form";
import { AssignEditorForm } from "./assign-editor-form";
import { RequirementsForm } from "./requirements-form";
import { MembersPanel } from "./members-panel";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { user } = await requireSession();

  let project: Awaited<ReturnType<typeof getProject>>;
  try {
    project = await getProject(user, params.id);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return (
        <main className="mx-auto max-w-2xl p-8">
          <p className="text-neutral-400">You don&apos;t have access to this project.</p>
        </main>
      );
    }
    throw err;
  }

  const nextStatuses = (PROJECT_STATUS_TRANSITIONS[project.status] ?? []).map((t) => t.to);
  const canManage = user.role === "org_admin" || user.role === "account_manager";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <p className="text-sm text-neutral-500">
          {project.client.name} · {project.priority} priority
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-300">Status: {project.status}</h2>
        {nextStatuses.length > 0 ? (
          <StatusForm projectId={project.id} nextStatuses={nextStatuses} />
        ) : (
          <p className="text-sm text-neutral-500">This is a terminal status — no further moves available.</p>
        )}
      </section>

      {canManage && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-300">Editor</h2>
          <p className="text-sm text-neutral-500">Currently: {project.editor?.name ?? "Unassigned"}</p>
          <AssignEditorForm projectId={project.id} />
        </section>
      )}

      {canManage && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-neutral-300">Requirements</h2>
          <RequirementsForm projectId={project.id} requirements={project.requirements} />
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-neutral-300">Members</h2>
        <MembersPanel
          projectId={project.id}
          members={project.members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            roleOnProject: m.roleOnProject,
          }))}
          canManage={canManage}
        />
      </section>
    </main>
  );
}
