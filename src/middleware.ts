import { NextRequest, NextResponse } from "next/server";
import { RESERVED_SLUGS } from "@/lib/constants";

/**
 * Extracts the organization slug from a request's Host header.
 *
 * Examples (prod, APP_BASE_DOMAIN="reel.app"):
 *   "acme.reel.app"      -> "acme"
 *   "reel.app"            -> null (base domain — platform surface)
 *   "www.reel.app"        -> null (reserved)
 *
 * Examples (dev, APP_BASE_DOMAIN_DEV="localhost:3000"):
 *   "acme.localhost:3000" -> "acme"
 *   "localhost:3000"      -> null
 */
export function extractOrgSlug(host: string): string | null {
  const baseDomain = process.env.APP_BASE_DOMAIN ?? "reel.app";
  const baseDomainDev = process.env.APP_BASE_DOMAIN_DEV ?? "localhost:3000";
  const normalizedHost = host.toLowerCase();

  for (const base of [baseDomain, baseDomainDev]) {
    if (normalizedHost === base) return null; // base domain itself, no subdomain
    if (normalizedHost.endsWith(`.${base}`)) {
      const sub = normalizedHost.slice(0, -(base.length + 1));
      // Only single-level subdomains are valid org slugs; anything with a
      // dot left over (e.g. a stray "foo.bar.reel.app") is not resolvable.
      if (sub && !sub.includes(".") && !RESERVED_SLUGS.has(sub)) {
        return sub;
      }
      return null;
    }
  }

  return null; // unrecognized host entirely — not our domain
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const orgSlug = extractOrgSlug(host);

  const requestHeaders = new Headers(request.headers);

  if (orgSlug) {
    // This header is the ONLY source of truth for "which org's data space
    // is this request in." It is set here, server-side, from the Host
    // header — a client can send a spoofed x-org-slug header directly, but
    // Next.js middleware runs first and overwrites it unconditionally, so
    // a client-supplied value is never trusted downstream.
    requestHeaders.set("x-org-slug", orgSlug);
  } else {
    requestHeaders.delete("x-org-slug");

    // Base-domain requests may only reach the platform-admin or marketing
    // surface — never the tenant app shell, which requires a resolved org.
    if (request.nextUrl.pathname.startsWith("/app")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
