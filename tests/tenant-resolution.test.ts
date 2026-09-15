import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { extractOrgSlug } from "@/middleware";

describe("extractOrgSlug", () => {
  const originalBase = process.env.APP_BASE_DOMAIN;
  const originalBaseDev = process.env.APP_BASE_DOMAIN_DEV;

  beforeEach(() => {
    process.env.APP_BASE_DOMAIN = "reel.app";
    process.env.APP_BASE_DOMAIN_DEV = "localhost:3000";
  });

  afterEach(() => {
    process.env.APP_BASE_DOMAIN = originalBase;
    process.env.APP_BASE_DOMAIN_DEV = originalBaseDev;
  });

  it("extracts a simple subdomain", () => {
    expect(extractOrgSlug("acme.reel.app")).toBe("acme");
  });

  it("returns null for the bare base domain", () => {
    expect(extractOrgSlug("reel.app")).toBeNull();
  });

  it("returns null for reserved subdomains", () => {
    expect(extractOrgSlug("www.reel.app")).toBeNull();
    expect(extractOrgSlug("api.reel.app")).toBeNull();
    expect(extractOrgSlug("platform-admin.reel.app")).toBeNull();
  });

  it("returns null for a multi-level subdomain (not a valid org slug)", () => {
    expect(extractOrgSlug("foo.bar.reel.app")).toBeNull();
  });

  it("returns null for a completely unrelated host", () => {
    expect(extractOrgSlug("evil.com")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(extractOrgSlug("ACME.REEL.APP")).toBe("acme");
  });

  it("works with the dev base domain (localhost with port)", () => {
    expect(extractOrgSlug("acme.localhost:3000")).toBe("acme");
    expect(extractOrgSlug("localhost:3000")).toBeNull();
  });
});
