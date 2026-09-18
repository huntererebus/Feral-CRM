import Link from "next/link";
import { requireSession } from "@/lib/session";
import { listClients } from "@/lib/services/clients";
import { ForbiddenError } from "@/lib/rbac";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateClientForm } from "./create-client-form";

export default async function ClientsPage() {
  const { user, organizationId } = await requireSession();

  if (!organizationId) {
    return (
      <p className="text-sm text-neutral-500">This page is only available within an organization&apos;s portal.</p>
    );
  }

  let clients: Awaited<ReturnType<typeof listClients>> = [];
  try {
    clients = await listClients(user, organizationId);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return <p className="text-sm text-neutral-500">You don&apos;t have access to the client list.</p>;
    }
    throw err;
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-lg font-semibold text-neutral-100">Clients</h1>

      {clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Add the first one below." />
      ) : (
        <Panel className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Account manager</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Projects</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-t border-neutral-900 hover:bg-neutral-900/40">
                  <td className="px-4 py-3">
                    <Link href={`/org-admin/clients/${client.id}`} className="font-medium text-neutral-100 hover:underline">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{client.accountManager?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-400">{client.status}</td>
                  <td className="px-4 py-3 font-mono text-neutral-400">{client._count.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <CreateClientForm />
    </div>
  );
}
