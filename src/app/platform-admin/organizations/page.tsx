import { requireSession } from "@/lib/session";
import { listOrganizations } from "@/lib/services/organizations";
import { ForbiddenError } from "@/lib/rbac";
import { CreateOrganizationForm } from "./create-organization-form";

export default async function PlatformAdminOrganizationsPage() {
  const { user } = await requireSession();

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  try {
    organizations = await listOrganizations(user);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return (
        <main className="mx-auto max-w-2xl p-8">
          <p className="text-neutral-400">
            You don&apos;t have access to this page. This surface is for platform administrators only.
          </p>
        </main>
      );
    }
    throw err;
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <h1 className="text-xl font-semibold">Organizations</h1>

      {organizations.length === 0 ? (
        <p className="text-sm text-neutral-500">No agencies yet — create the first one below.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="py-2">Name</th>
              <th>Subdomain</th>
              <th>Status</th>
              <th>Clients</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="border-t border-neutral-800">
                <td className="py-2">{org.name}</td>
                <td>{org.slug}</td>
                <td>
                  <span
                    className={
                      org.status === "active"
                        ? "text-emerald-400"
                        : org.status === "suspended"
                          ? "text-red-400"
                          : "text-amber-400"
                    }
                  >
                    {org.status}
                  </span>
                </td>
                <td>{org._count.clients}</td>
                <td>{org._count.projects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <CreateOrganizationForm />
    </main>
  );
}
