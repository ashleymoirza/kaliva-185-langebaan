/**
 * Resilient Prisma accessor (Prisma 7 — connects through a driver adapter).
 *
 * The site must build and serve even when no PostgreSQL database is configured
 * (CI builds, preview). getDb() returns null when DATABASE_URL is absent or the
 * client/adapter are unavailable; callers fall back to in-memory storage.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
let cached: any = null;
let attempted = false;

export async function getDb(): Promise<any | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (cached || attempted) return cached;
  attempted = true;
  try {
    const [{ PrismaClient }, { PrismaPg }] = await Promise.all([
      import("@prisma/client"),
      import("@prisma/adapter-pg"),
    ]);
    if (typeof PrismaClient !== "function") return null;
    const adapter = new PrismaPg({ connectionString: url });
    cached = new PrismaClient({ adapter });
    return cached;
  } catch (err) {
    console.warn("[db] Prisma client/adapter unavailable — running in demo mode.", err);
    return null;
  }
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
