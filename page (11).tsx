import { requireSession } from "@/lib/session";
import { getOrgSettings } from "@/lib/services/organizations";
import { OrgSettingsForm } from "./org-settings-form";

export default async function OrganizationSettingsPage() {
  const { user, organizationId } = await requireSession();

  if (!organizationId) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-neutral-400">This page is only available within an organization&apos;s portal.</p>
      </main>
    );
  }

  const org = await getOrgSettings(user, organizationId);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Organization branding</h1>
      <p className="text-sm text-neutral-500">
        These colors and images apply across your team&apos;s and clients&apos; portal at{" "}
        <code className="text-neutral-300">{org.slug}.reel.app</code>.
      </p>
      <OrgSettingsForm org={org} />
    </main>
  );
}
