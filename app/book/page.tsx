import type { Metadata } from "next";
import { UNITS } from "@/lib/units";
import BookingForm from "@/components/BookingForm";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Book your stay",
  description:
    "Book a self-catering apartment at Kaliva 185, Club Mykonos, Langebaan. Live pricing, instant availability and secure PayFast or Stripe checkout.",
  alternates: { canonical: "/book" },
  robots: { index: true, follow: true },
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const requested = Array.isArray(sp.unit) ? sp.unit[0] : sp.unit;
  const defaultUnit = UNITS.some((u) => u.slug === requested) ? requested : undefined;

  const options = UNITS.map((u) => ({
    slug: u.slug,
    name: u.name,
    sleeps: u.sleeps,
    basePriceCents: u.basePriceCents,
  }));

  return (
    <Container className="py-14">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Book your stay</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Choose your dates to see a live, all-inclusive price. Pay securely with PayFast or Stripe,
          or send an enquiry to pay later.
        </p>
      </header>
      <BookingForm units={options} defaultUnit={defaultUnit} />
    </Container>
  );
}
