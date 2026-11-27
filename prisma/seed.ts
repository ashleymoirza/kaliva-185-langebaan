/* eslint-disable @typescript-eslint/no-explicit-any */
import { UNITS } from "../lib/units";

/**
 * Seed the four apartments into Postgres.
 * Run after `npx prisma migrate dev`:
 *   npx tsx prisma/seed.ts
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const [{ PrismaClient }, { PrismaPg }] = await Promise.all([
    import("@prisma/client"),
    import("@prisma/adapter-pg"),
  ]);
  const prisma: any = new (PrismaClient as any)({ adapter: new (PrismaPg as any)({ connectionString: url }) });
  try {
    for (const u of UNITS) {
      await prisma.unit.upsert({
        where: { slug: u.slug },
        update: {
          name: u.name,
          description: u.description,
          bedrooms: u.bedrooms,
          sleeps: u.sleeps,
          bathrooms: u.bathrooms,
          sizeSqm: u.sizeSqm,
          view: u.view,
          basePriceCents: u.basePriceCents,
          amenities: u.amenities,
          images: u.images,
        },
        create: {
          slug: u.slug,
          name: u.name,
          description: u.description,
          bedrooms: u.bedrooms,
          sleeps: u.sleeps,
          bathrooms: u.bathrooms,
          sizeSqm: u.sizeSqm,
          view: u.view,
          basePriceCents: u.basePriceCents,
          amenities: u.amenities,
          images: u.images,
        },
      });
    }
    console.log(`Seeded ${UNITS.length} units.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
