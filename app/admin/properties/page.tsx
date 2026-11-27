import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { listProperties } from "@/lib/properties-store";
import PropertyManager from "@/components/admin/PropertyManager";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Manage guest houses",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage() {
  await requireAdmin();
  const properties = await listProperties();
  return (
    <Container className="py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Guest houses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add and edit the properties you market. Upload photos, set the area, facilities and visibility.
        </p>
      </header>
      <PropertyManager initialProperties={properties} />
    </Container>
  );
}
