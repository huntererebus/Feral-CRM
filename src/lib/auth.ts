import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentOrganization, getBaseAppHost } from "@/lib/tenant";
import { isUserAllowedInTenant } from "@/lib/tenant-auth";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// OAuth providers must always call back to one fixed host — Google/Apple
// require an exact, pre-registered redirect URI per app, and neither
// supports registering a wildcard for arbitrary org subdomains. Auth.js's
// redirectProxyUrl exists for exactly this: the OAuth round trip always
// completes against the base domain, and Auth.js itself (via a signed
// state param) redirects the browser back to the org subdomain that
// started the flow. Only https://<base-domain>/api/auth/callback/{google,apple}
// needs to be registered in each provider's console — never a per-org URL.
const oauthCallbackBase = `https://${getBaseAppHost()}`;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Database sessions (not JWT) so a session can be revoked server-side —
  // required given clients are uploading private media (Section 10).
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        if (user.status !== "active") return null;
        if (!user.emailVerifiedAt) return null;

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) return null;

        const org = await getCurrentOrganization();
        if (!isUserAllowedInTenant(user, org)) return null;

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          clientId: user.clientId,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectProxyUrl: `${oauthCallbackBase}/api/auth/callback/google`,
      // Safe here despite the scary name: this is what lets Auth.js link a
      // Google account to an *existing* User row by matching email, with
      // no prompt. Normally that's risky (an unverified-email provider
      // could let someone claim another person's account), but Google
      // only returns a verified email, and — critically — our own signIn()
      // callback below still requires that email to already belong to an
      // active, invite-provisioned User in the right tenant before letting
      // the sign-in through at all. There's no path here to create an
      // account or take over one that wasn't already provisioned by an
      // org_admin's invite.
      allowDangerousEmailAccountLinking: true,
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID ?? "",
      // Apple's "client secret" is a signed JWT you generate yourself (not
      // a static string) and it expires — see SETUP.md's OAuth section for
      // the regeneration cadence and how to build it.
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
      redirectProxyUrl: `${oauthCallbackBase}/api/auth/callback/apple`,
      // Same reasoning as Google's above — Apple also only returns a
      // verified email, and our own signIn() callback is the real gate.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Credentials already did its own full check inside authorize()
      // above; this callback only needs to additionally gate the OAuth
      // providers, which have no equivalent of authorize() to hook into.
      if (account?.provider === "google" || account?.provider === "apple") {
        if (!user.email) return false;
        const existing = await db.user.findUnique({ where: { email: user.email } });
        // No self-service signup via OAuth: the email must already belong
        // to an active, invite-provisioned account. An unrecognized email
        // is rejected, never auto-created.
        if (!existing || existing.status !== "active" || !existing.emailVerifiedAt) return false;

        const org = await getCurrentOrganization();
        if (!isUserAllowedInTenant(existing, org)) return false;

        await db.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } });
      }
      return true;
    },
    async session({ session, user }) {
      // With the database strategy, `user` is the full adapter user record.
      // Re-fetch our custom fields since the default adapter user shape
      // doesn't include them.
      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.role = dbUser.role;
        session.user.organizationId = dbUser.organizationId;
        session.user.clientId = dbUser.clientId;
      }
      return session;
    },
  },
});
