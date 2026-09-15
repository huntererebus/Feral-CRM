import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

// Auth flows use bcrypt and Prisma — both require the Node.js runtime, not
// the Edge runtime (unlike src/middleware.ts, which is edge-only and does
// no direct DB/crypto work for exactly this reason).
export const runtime = "nodejs";
