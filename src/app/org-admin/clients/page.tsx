import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listClients } from "@/lib/services/clients";
import { ForbiddenError } from "@/lib/rbac";
import { CreateClientForm } from "./create-client-form";

export default async function ClientsPage() {
  const { user, organizationId } = await requireSession();

  if (!organizationId) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-neutral-400">This page is only available within an organization&apos;s portal.</p>
      </main>
    );
  }

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  try {
    clients = await listClients(user, organizationId);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return (
        <main className="mx-auto max-w-2xl p-8">
          <p className="text-neutral-400">You don&apos;t have access to the client list.</p>
        </main>
      );
    }
    throw err;
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <h1 className="text-xl font-semibold">Clients</h1>

      {clients.length === 0 ? (
        <p className="text-sm text-neutral-500">No clients yet — add the first one below.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-neutral-500">
            <tr>
              <th className="py-2">Name</th>
              <th>Account manager</th>
              <th>Status</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-neutral-800">
                <td className="py-2">
                  <Link href={`/org-admin/clients/${client.id}`} className="hover:underline">
                    {client.name}
                  </Link>
                </td>
                <td>{client.accountManager?.name ?? "—"}</td>
                <td>{client.status}</td>
                <td>{client._count.projects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <CreateClientForm />
    </main>
  );
}
