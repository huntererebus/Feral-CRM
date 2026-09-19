import { describe, it, expect } from "vitest";
import { isUserAllowedInTenant } from "@/lib/tenant-auth";
import type { Organization } from "@prisma/client";

function org(overrides: Partial<Organization> = {}): Organization {
  return {
    id: "org-a",
    name: "Acme",
    slug: "acme",
    status: "active",
    primaryColor: null,
    secondaryColor: null,
    logoUrl: null,
    faviconUrl: null,
    storageLimitBytes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Organization;
}

describe("isUserAllowedInTenant", () => {
  it("allows a platform_admin on the base domain (no org)", () => {
    expect(isUserAllowedInTenant({ role: "platform_admin", organizationId: null }, null)).toBe(true);
  });

  it("blocks a platform_admin on an org subdomain", () => {
    expect(isUserAllowedInTenant({ role: "platform_admin", organizationId: null }, org())).toBe(false);
  });

  it("allows an org member on their own org's subdomain", () => {
    expect(isUserAllowedInTenant({ role: "account_manager", organizationId: "org-a" }, org({ id: "org-a" }))).toBe(true);
  });

  it("blocks an org member on the base domain (no org)", () => {
    expect(isUserAllowedInTenant({ role: "account_manager", organizationId: "org-a" }, null)).toBe(false);
  });

  it("blocks an org member on a different org's subdomain", () => {
    expect(isUserAllowedInTenant({ role: "account_manager", organizationId: "org-a" }, org({ id: "org-b" }))).toBe(false);
  });
});
