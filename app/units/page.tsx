import type { Metadata } from "next";
import { UNITS } from "@/lib/units";
import UnitFilters from "@/components/UnitFilters";
import Container from "@/components/ui/Container";
import Badge from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Apartments",
  description: "Browse all Kaliva 185 apartments at Club Mykonos — studio, 1, 2 and 3-bedroom self-catering units with lagoon and beachfront views.",
  alternates: { canonical: "/units" },
};

const kalivaUnits = UNITS.filter((u) => u.propertySlug === "kaliva-185-langebaan");
const otherUnits = UNITS.filter((u) => u.propertySlug !== "kaliva-185-langebaan");

export default function UnitsPage() {
  return (
    <Container size="xl" className="py-14">
      <header className="mb-10">
        <Badge variant="brand" className="mb-4 inline-flex">Kaliva 185 Langebaan</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Our beachfront apartments</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Four unique self-catering apartments in our privately owned flagship property.
          The 3-bedroom beachfront flagship sleeps 6 with a private braai — rooms not rented separately.
          All units include free WiFi, parking, air-conditioning and resort pool/fitness access.
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Kaliva 185 Flagship</h2>
        <UnitFilters units={kalivaUnits} />
      </section>

      {otherUnits.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Other properties we manage</h2>
          <UnitFilters units={otherUnits} />
        </section>
      )}
    </Container>
  );
}