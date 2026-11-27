import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";
import { getBooking } from "@/lib/bookings-store";
import { getUnit } from "@/lib/units";
import { formatZAR, formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Booking received",
  robots: { index: false, follow: false },
};

export default async function ReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const { booking: bookingId } = await searchParams;
  const booking = bookingId ? await getBooking(bookingId) : null;
  const unit = booking ? getUnit(booking.unitSlug) : undefined;

  return (
    <Container className="py-20">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="mt-5 text-3xl font-bold text-slate-900">Thank you for booking!</h1>
        <p className="mt-3 text-slate-600">
          {booking
            ? "Your payment request has been received. We'll email you a confirmation as soon as the payment clears."
            : "We've received your request. If you reached this page in error, please contact us."}
        </p>

        {booking && (
          <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Reference</dt><dd className="font-mono text-slate-800">{booking.id.slice(0, 8)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Apartment</dt><dd className="text-slate-800">{unit?.name ?? booking.unitSlug}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Dates</dt><dd className="text-slate-800">{formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Guests</dt><dd className="text-slate-800">{booking.guests}</dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2"><dt className="text-slate-500">Total</dt><dd className="font-bold text-slate-900">{formatZAR(booking.totalCents)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="capitalize text-slate-800">{booking.status}</dd></div>
            </dl>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <LinkButton href="/">Back home</LinkButton>
          <LinkButton href="/units" variant="secondary">Browse more</LinkButton>
        </div>
        <p className="mt-6 text-xs text-slate-400">
          Questions? <Link href="/about" className="underline">Contact us</Link>.
        </p>
      </div>
    </Container>
  );
}
