import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listProjects } from "@/lib/services/projects";
import { listClients } from "@/lib/services/clients";
import { ForbiddenError } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { CreateProjectForm } from "./create-project-form";

export default async function ProjectsPage() {
  const { user, organizationId } = await requireSession();

  if (!organizationId) {
    return (
      <p className="text-sm text-neutral-500">This page is only available within an organization&apos;s portal.</p>
    );
  }

  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let clients: Awaited<ReturnType<typeof listClients>> = [];
  try {
    projects = await listProjects(user, organizationId);
    // Only used to populate the create form's client picker — a client-role
    // user creating their own project never sees this list, and
    // createProject enforces their clientId server-side regardless.
    clients = user.role === "client" ? [] : await listClients(user, organizationId);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return <p className="text-sm text-neutral-500">You don&apos;t have access to the project list.</p>;
    }
    throw err;
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-lg font-semibold text-neutral-100">Projects</h1>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description={user.role === "editor" ? "You have no assignments yet." : "Add the first one below."}
        />
      ) : (
        <Panel className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Client</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Priority</th>
                <th className="px-4 py-2.5 font-medium">Editor</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-t border-neutral-900 hover:bg-neutral-900/40">
                  <td className="px-4 py-3">
                    <Link href={`/org-admin/projects/${project.id}`} className="font-medium text-neutral-100 hover:underline">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{project.client.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400">{project.priority}</td>
                  <td className="px-4 py-3">
                    {project.editor ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={project.editor.name} size="sm" />
                        <span className="text-neutral-300">{project.editor.name}</span>
                      </div>
                    ) : (
                      <span className="text-neutral-600">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {user.role !== "editor" && <CreateProjectForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} />}
    </div>
  );
}
