/**
 * Bootstrap script — creates the first ADMIN user.
 *
 * Usage:
 *   npx tsx prisma/bootstrap-admin.ts
 *
 * Environment variables (from apps/web/.env):
 *   DATABASE_URL
 *   ADMIN_EMAIL    - email for the admin account (default: admin@gceerode.ac.in)
 *   ADMIN_PASSWORD - plain-text password to set (required)
 *   ADMIN_NAME     - display name (default: "SAM Admin")
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in .env");
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD must be set and at least 8 characters long");
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@gceerode.ac.in").toLowerCase();
  const adminName = process.env.ADMIN_NAME ?? "SAM Admin";

  const pool = new Pool({ connectionString });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);
  const db = new PrismaClient({ adapter });

  try {
    const passwordHash = await hash(adminPassword, 12);

    const user = await db.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: adminName,
        passwordHash,
      },
      update: {
        name: adminName,
        passwordHash,
      },
    });

    // Ensure ADMIN role assignment exists
    await db.roleAssignment.upsert({
      where: {
        // Unique constraint workaround — find by userId + role
        id: (
          await db.roleAssignment.findFirst({
            where: { userId: user.id, role: "ADMIN" },
            select: { id: true },
          })
        )?.id ?? "new",
      },
      create: {
        userId: user.id,
        role: "ADMIN",
      },
      update: {},
    });

    console.log(`✅ Admin user ready: ${adminEmail}`);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Bootstrap failed:", err.message);
  process.exit(1);
});
