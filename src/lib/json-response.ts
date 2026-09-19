import { NextResponse } from "next/server";

/**
 * NextResponse.json() calls JSON.stringify() with no way to pass a
 * replacer through, and JSON.stringify throws outright on a bigint —
 * `TypeError: Do not know how to serialize a BigInt`. Two schema fields
 * are bigint (MediaVersion.fileSizeBytes, Organization.storageLimitBytes),
 * so any route returning either would 500 the instant it actually ran
 * (this went undetected until Stage 8's UI work started calling the media
 * endpoints — unit tests never exercise the actual serialization path).
 * Every route goes through jsonOk, so fixing it here fixes it everywhere
 * at once rather than patching each call site that happens to touch one
 * of those fields today, or the next one that touches them tomorrow.
 * Serializing as a string (not Number) is deliberate — a file size or
 * storage limit that happened to exceed Number.MAX_SAFE_INTEGER would
 * silently lose precision as a JS number, and a string round-trips exactly.
 */
function bigIntSafe(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

/**
 * Deliberately its own module, not defined inline in api-response.ts:
 * api-response.ts also exports withRouteErrorHandling, which needs
 * session.ts's error classes, which transitively import auth.ts, which
 * instantiates PrismaClient at module load. jsonOk/jsonError themselves
 * have no real dependency on any of that — keeping them here means they
 * (and this file's bigIntSafe fix) can be unit-tested directly (see
 * tests/api-response.test.ts) independent of a generated Prisma client.
 */
export function jsonOk<T>(data: T, init?: { status?: number; meta?: unknown }) {
  const body = JSON.parse(JSON.stringify({ data, ...(init?.meta ? { meta: init.meta } : {}) }, bigIntSafe));
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
