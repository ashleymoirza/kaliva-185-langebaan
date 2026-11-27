import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getPricingConfig, listBlocked } from "@/lib/bookings-store";
import { UNITS } from "@/lib/units";
import { listProperties } from "@/lib/properties-store";
import RatesManager, { type RoomRow } from "@/components/admin/RatesManager";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Prices & availability",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RatesPage() {
  await requireAdmin();
  const [config, blocked, properties] = await Promise.all([
    getPricingConfig(),
    listBlocked(),
    listProperties(),
  ]);
  const nameFor = (slug: string) => properties.find((p) => p.slug === slug)?.name ?? slug;
  const rooms: RoomRow[] = UNITS.map((u) => ({ slug: u.slug, name: u.name, propertyName: nameFor(u.propertySlug) }));

  return (
    <Container className="py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Prices &amp; availability</h1>
        <p className="mt-1 text-sm text-slate-500">
          Set low and high season prices, choose the high-season months, control the deposit, and block dates.
        </p>
      </header>
      <RatesManager initialConfig={config} rooms={rooms} initialBlocked={blocked} />
    </Container>
  );
}
