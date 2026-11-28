import type { Metadata } from "next";
import { getDraft, getLiveLayout } from "@/lib/builder/store";
import { getAdminSession } from "@/lib/auth";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import { SITE } from "@/lib/site";
import { ShareButton } from "@/components/ShareButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${SITE.name} — Beachfront apartments at ${SITE.resort}`,
  description:
    "Beachfront self-catering apartments in Langebaan at Club Mykonos. Private beach, pools, braai facilities, free WiFi & parking. Book direct for the best price.",
  alternates: { canonical: "/" },
};

export default async function HomePage({searchParams}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const sp = await searchParams;
  // Admins can preview the unpublished draft with ?preview=1
  const isAdmin = sp.preview === "1" ? await getAdminSession() : null;
  const layout = isAdmin ? await getDraft("home") : (await getLiveLayout("home")).layout;
  const faqBlock = layout.blocks.find((b) => b.type === "faq" && b.visible);
  const faqItems = Array.isArray(faqBlock?.props.items) ? (faqBlock!.props.items as { q?: string; a?: string }[]) : [];

  const lodgingJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: SITE.name,
    address: { "@type": "PostalAddress", streetAddress: SITE.address, addressCountry: "ZA" },
    geo: { "@type": "GeoCoordinates", latitude: SITE.coords.lat, longitude: SITE.coords.lng },
    priceRange: "R950–R2950",
    amenityFeature: ["Private beach", "Two pools", "Free WiFi", "Free parking", "Fitness centre", "Braai facilities"].map(
      (name) => ({ "@type": "LocationFeatureSpecification", name, value: true }),
    ),
  };
  const faqJsonLd = faqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.q ?? "",
          acceptedAnswer: { "@type": "Answer", text: f.a ?? "" },
        })),
      }
    : null;

  return (
    <>

      <BlockRenderer layout={layout} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(faqJsonLd)}} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(lodgingJsonLd)}} />

      {/* Share & Save Section */}
      <div className="bg-white shadow-card sticky-top inset-x-0 z-50 py-4 bg-white/80 backdrop-filter-blur">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShareButton
              bookingId="share-demo"
              depositPercent={50}
              onShare={(text) => {
                // Could trigger analytics or lead capture here
                console.log("Shared:", text);
              }}
            />
          </div>
          <div className="text-sm text-slate-500">
            Share your booking and save 5% on your next stay
          </div>
        </div>
      </div>

    </>
  );
}