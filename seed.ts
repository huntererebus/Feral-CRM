import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// All seeded accounts share this password for local dev convenience only —
// never used outside a local/dev database.
const DEV_PASSWORD = "dev-password-123";

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  const platformAdmin = await db.user.upsert({
    where: { email: "platform-admin@reel.app" },
    update: {},
    create: {
      email: "platform-admin@reel.app",
      name: "Platform Admin",
      role: "platform_admin",
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    },
  });

  const org = await db.organization.upsert({
    where: { slug: "acme" },
    update: {},
    create: {
      name: "Acme Media Co.",
      slug: "acme",
      status: "active",
      primaryColor: "#4f46e5",
      secondaryColor: "#14b8a6",
    },
  });

  const orgAdmin = await db.user.upsert({
    where: { email: "admin@acme.test" },
    update: {},
    create: {
      email: "admin@acme.test",
      name: "Ada Admin",
      role: "org_admin",
      organizationId: org.id,
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    },
  });

  const accountManager = await db.user.upsert({
    where: { email: "am@acme.test" },
    update: {},
    create: {
      email: "am@acme.test",
      name: "Alex Manager",
      role: "account_manager",
      organizationId: org.id,
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    },
  });

  const editor = await db.user.upsert({
    where: { email: "editor@acme.test" },
    update: {},
    create: {
      email: "editor@acme.test",
      name: "Eli Editor",
      role: "editor",
      organizationId: org.id,
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    },
  });

  const client = await db.client.upsert({
    where: { id: "seed-client-1" }, // stable id for idempotent re-seeding
    update: {},
    create: {
      id: "seed-client-1",
      organizationId: org.id,
      name: "Northwind Boutique",
      accountManagerId: accountManager.id,
      status: "active",
    },
  });

  const clientUser = await db.user.upsert({
    where: { email: "client@northwind.test" },
    update: {},
    create: {
      email: "client@northwind.test",
      name: "Nora Northwind",
      role: "client",
      organizationId: org.id,
      clientId: client.id,
      passwordHash,
      status: "active",
      emailVerifiedAt: new Date(),
    },
  });

  const project = await db.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      organizationId: org.id,
      clientId: client.id,
      name: "Fall Launch Reel",
      description: "15s Instagram Reel for the fall product launch.",
      contentType: "Reel",
      platform: "Instagram",
      status: "ASSIGNED",
      accountManagerId: accountManager.id,
      editorId: editor.id,
      createdById: clientUser.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await db.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: editor.id } },
    update: {},
    create: { projectId: project.id, userId: editor.id, roleOnProject: "editor" },
  });

  console.log("Seed complete.");
  console.log(`  Platform admin: platform-admin@reel.app / ${DEV_PASSWORD} (base domain)`);
  console.log(`  Org admin:      admin@acme.test / ${DEV_PASSWORD} (acme.localhost:3000)`);
  console.log(`  Account mgr:    am@acme.test / ${DEV_PASSWORD} (acme.localhost:3000)`);
  console.log(`  Editor:         editor@acme.test / ${DEV_PASSWORD} (acme.localhost:3000)`);
  console.log(`  Client:         client@northwind.test / ${DEV_PASSWORD} (acme.localhost:3000)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
