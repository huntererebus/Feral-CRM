import { describe, it, expect } from "vitest";
import { createOrganizationSchema } from "@/lib/validation/organizations";
import { inviteUserSchema } from "@/lib/validation/users";
import { RESERVED_SLUGS, SLUG_PATTERN } from "@/lib/constants";

describe("createOrganizationSchema", () => {
  const valid = {
    name: "Acme Media Co.",
    slug: "acme",
    adminEmail: "admin@acme.test",
    adminName: "Ada Admin",
  };

  it("accepts a well-formed input", () => {
    expect(createOrganizationSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an uppercase or symbol-containing slug", () => {
    expect(createOrganizationSchema.safeParse({ ...valid, slug: "Acme_Co" }).success).toBe(false);
  });

  it("rejects a slug that's too short", () => {
    expect(createOrganizationSchema.safeParse({ ...valid, slug: "a" }).success).toBe(false);
  });

  it("rejects an invalid admin email", () => {
    expect(createOrganizationSchema.safeParse({ ...valid, adminEmail: "not-an-email" }).success).toBe(false);
  });
});

describe("SLUG_PATTERN / RESERVED_SLUGS (shared between middleware and org creation)", () => {
  it("matches simple lowercase slugs", () => {
    expect(SLUG_PATTERN.test("acme")).toBe(true);
    expect(SLUG_PATTERN.test("acme-media")).toBe(true);
  });

  it("rejects slugs with invalid characters or leading/trailing hyphens", () => {
    expect(SLUG_PATTERN.test("Acme")).toBe(false);
    expect(SLUG_PATTERN.test("-acme")).toBe(false);
    expect(SLUG_PATTERN.test("acme-")).toBe(false);
    expect(SLUG_PATTERN.test("acme_media")).toBe(false);
  });

  it("flags every reserved word as reserved (sanity check on the set itself)", () => {
    for (const word of ["www", "api", "admin", "platform-admin"]) {
      expect(RESERVED_SLUGS.has(word)).toBe(true);
    }
  });
});

describe("inviteUserSchema", () => {
  it("requires clientId when role is client", () => {
    const result = inviteUserSchema.safeParse({
      email: "client@northwind.test",
      name: "Nora",
      role: "client",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a client invite with clientId present", () => {
    const result = inviteUserSchema.safeParse({
      email: "client@northwind.test",
      name: "Nora",
      role: "client",
      clientId: "client-1",
    });
    expect(result.success).toBe(true);
  });

  it("does not require clientId for staff roles", () => {
    const result = inviteUserSchema.safeParse({
      email: "editor@acme.test",
      name: "Eli",
      role: "editor",
    });
    expect(result.success).toBe(true);
  });
});
