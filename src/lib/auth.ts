import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentOrganization } from "@/lib/tenant";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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

        // Two-tier isolation check #1 of 3 (Section 10): a login attempt on
        // an org's subdomain must belong to that org, or be a platform
        // admin logging in on the base domain. This runs even before the
        // per-request app-layer checks on every subsequent API call — a
        // user simply cannot establish a session in the wrong org's space.
        const org = await getCurrentOrganization();
        if (user.role === "platform_admin") {
          if (org !== null) return null; // platform admins only log in on the base domain
        } else {
          if (org === null || user.organizationId !== org.id) return null;
        }

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
  ],
  callbacks: {
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
