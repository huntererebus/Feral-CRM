import type { Role } from "@prisma/client";

export type NavItem = { href: string; label: string };

/**
 * What each role sees in the sidebar. A platform_admin operates entirely
 * outside a tenant org (their own console on the base domain), so they get
 * a distinct, short list rather than a filtered version of the org nav.
 */
export function navItemsForRole(role: Role): NavItem[] {
  if (role === "platform_admin") {
    return [{ href: "/platform-admin/organizations", label: "Organizations" }];
  }

  const items: NavItem[] = [{ href: "/org-admin/projects", label: "Projects" }];

  if (role === "org_admin" || role === "account_manager") {
    items.push({ href: "/org-admin/clients", label: "Clients" });
  }

  if (role === "org_admin") {
    items.push({ href: "/settings/organization", label: "Settings" });
  }

  return items;
}
