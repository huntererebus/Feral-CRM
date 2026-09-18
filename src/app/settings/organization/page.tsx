import { requireSession } from "@/lib/session";
import { getOrgSettings } from "@/lib/services/organizations";
import { Panel, PanelBody } from "@/components/ui/panel";
import { OrgSettingsForm } from "./org-settings-form";

export default async function OrganizationSettingsPage() {
  const { user, organizationId } = await requireSession();

  if (!organizationId) {
    return (
      <p className="text-sm text-neutral-500">This page is only available within an organization&apos;s portal.</p>
    );
  }

  const org = await getOrgSettings(user, organizationId);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-100">Organization branding</h1>
        <p className="mt-1 text-sm text-neutral-500">
          These colors and images apply across your team&apos;s and clients&apos; portal at{" "}
          <span className="font-mono text-neutral-400">{org.slug}.reel.app</span>.
        </p>
      </div>
      <Panel>
        <PanelBody>
          <OrgSettingsForm org={org} />
        </PanelBody>
      </Panel>
    </div>
  );
}
