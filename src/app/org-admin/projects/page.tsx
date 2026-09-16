import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listProjects } from "@/lib/services/projects";
import { listClients } from "@/lib/services/clients";
import { ForbiddenError } from "@/lib/rbac";
import { CreateProjectForm } from "./create-project-form";

export default async function ProjectsPage() {
  const { user, organizationId } = await requireSession();

  if (!organizationId) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-neutral-400">This page is only available within an organization&apos;s portal.</p>
      </main>
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
      return (
        <main className="mx-auto max-w-2xl p-8">
          <p className="text-neutral-400">You don&apos;t have access to the project list.</p>
        </main>
      );
    }
    throw err;
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <h1 className="text-xl font-semibold">Projects</h1>

      {projects.length === 0 ? (
        <p className="text-sm text-neutral-500">No projects yet — add the first one below.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="py-2">Name</th>
              <th>Client</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Editor</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-t border-neutral-800">
                <td className="py-2">
                  <Link href={`/org-admin/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </td>
                <td>{project.client.name}</td>
                <td>{project.status}</td>
                <td>{project.priority}</td>
                <td>{project.editor?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {user.role !== "editor" && <CreateProjectForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} />}
    </main>
  );
}
