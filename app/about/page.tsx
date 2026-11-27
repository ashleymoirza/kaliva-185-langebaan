import type { Metadata } from "next";
import { getDraft, getLiveLayout } from "@/lib/builder/store";
import { getAdminSession } from "@/lib/auth";
import BlockRenderer from "@/components/blocks/BlockRenderer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About & Location",
  description:
    "Discover Club Mykonos and the Langebaan area — Calypso Beach, the West Coast National Park, fishing, cycling and more. Find Kaliva 185 on the map.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const sp = await searchParams;
  const isAdmin = sp.preview === "1" ? await getAdminSession() : null;
  const layout = isAdmin ? await getDraft("about") : (await getLiveLayout("about")).layout;
  return <BlockRenderer layout={layout} />;
}
