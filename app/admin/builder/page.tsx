import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getDraft } from "@/lib/builder/store";
import Builder, { type BuilderPage } from "@/components/admin/Builder";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Website builder",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGES: BuilderPage[] = [
  { slug: "home", label: "Homepage", path: "/" },
  { slug: "about", label: "About & Location", path: "/about" },
];

export default async function BuilderPageRoute() {
  await requireAdmin();
  const layout = await getDraft("home");

  return (
    <Container className="py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Website builder</h1>
        <p className="mt-1 text-sm text-slate-500">
          Drag sections to reorder, click to edit, then publish. Changes are saved as a draft first.
        </p>
      </header>
      <Builder pages={PAGES} initialPage="home" initialLayout={layout} />
    </Container>
  );
}
