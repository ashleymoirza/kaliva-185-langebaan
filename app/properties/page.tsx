import type { Metadata } from "next";
import { listActiveProperties } from "@/lib/properties-store";
import PropertyFilters from "@/components/PropertyFilters";
import Container from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guest houses",
  description:
    "Browse the self-catering guest houses we manage on the West Coast — each with its own rooms, photos and rates.",
  alternates: { canonical: "/properties" },
};

export default async function PropertiesPage() {
  const properties = await listActiveProperties();
  return (
    <Container className="py-14">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Our guest houses</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Kaliva 185 Langebaan and the other hand-picked properties we manage. Pick a house to see its
          rooms, photos and rates.
        </p>
      </header>
      <PropertyFilters properties={properties} />
    </Container>
  );
}
