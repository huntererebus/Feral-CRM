import { randomBytes, createHash } from "crypto";
import { db } from "@/lib/db";

const TOKEN_BYTES = 32;
const INVITE_TTL_HOURS = 72;
const RESET_TTL_HOURS = 1;

function hashToken(token: string): string {
  // Tokens are stored hashed (like passwords) so a database read alone
  // never yields a usable token — matches the "secure password reset"
  // requirement in Section 10.
  return createHash("sha256").update(token).digest("hex");
}

async function issueToken(
  userId: string,
  purpose: "invite" | "password_reset",
  ttlHours: number
): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  await db.actionToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
    },
  });
  return token; // raw token is only ever returned here — for the caller to email, never logged
}

export function issueInviteToken(userId: string) {
  return issueToken(userId, "invite", INVITE_TTL_HOURS);
}

export function issuePasswordResetToken(userId: string) {
  return issueToken(userId, "password_reset", RESET_TTL_HOURS);
}

/**
 * Verifies and consumes a token in one step. Returns the associated userId
 * on success, or null on any failure (not found, expired, already used) —
 * deliberately undifferentiated so callers can't be used to probe which
 * failure mode occurred.
 */
export async function consumeToken(
  rawToken: string,
  purpose: "invite" | "password_reset"
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const record = await db.actionToken.findUnique({ where: { tokenHash } });

  if (!record || record.purpose !== purpose) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await db.actionToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.userId;
}
