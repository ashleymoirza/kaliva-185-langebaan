import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 moved the connection URL out of schema.prisma and into this config
 * file (used by migrate/introspect). The runtime client connects via a driver
 * adapter — see lib/db.ts (PrismaPg).
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: { url: process.env.DATABASE_URL ?? "" },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "npx tsx prisma/seed.ts",
  },
});
