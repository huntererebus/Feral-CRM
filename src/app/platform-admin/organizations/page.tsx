import { requireSession } from "@/lib/session";
import { listOrganizations } from "@/lib/services/organizations";
import { ForbiddenError } from "@/lib/rbac";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateOrganizationForm } from "./create-organization-form";

const STATUS_COLOR: Record<string, string> = {
  active: "text-emerald-400",
  suspended: "text-red-400",
};

export default async function PlatformAdminOrganizationsPage() {
  const { user } = await requireSession();

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  try {
    organizations = await listOrganizations(user);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return (
        <p className="text-sm text-neutral-500">
          You don&apos;t have access to this page. This surface is for platform administrators only.
        </p>
      );
    }
    throw err;
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-lg font-semibold text-neutral-100">Organizations</h1>

      {organizations.length === 0 ? (
        <EmptyState title="No agencies yet" description="Create the first one below." />
      ) : (
        <Panel className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Subdomain</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Clients</th>
                <th className="px-4 py-2.5 font-medium">Projects</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-t border-neutral-900 hover:bg-neutral-900/40">
                  <td className="px-4 py-3 font-medium text-neutral-100">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-neutral-400">{org.slug}</td>
                  <td className={`px-4 py-3 ${STATUS_COLOR[org.status] ?? "text-amber-400"}`}>{org.status}</td>
                  <td className="px-4 py-3 font-mono text-neutral-400">{org._count.clients}</td>
                  <td className="px-4 py-3 font-mono text-neutral-400">{org._count.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <CreateOrganizationForm />
    </div>
  );
}
