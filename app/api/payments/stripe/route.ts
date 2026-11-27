import type { NextRequest } from "next/server";
import { getBooking, updateBookingStatus } from "@/lib/bookings-store";
import { createStripeCheckout, stripeConfigured } from "@/lib/payments";
import { SITE } from "@/lib/site";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`stripe:${clientIp(req)}`, 20, 60_000);
  if (!rl.success) return tooMany(rl.reset);

  if (!stripeConfigured()) {
    return Response.json({ ok: false, message: "Stripe is not configured." }, { status: 503 });
  }
  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  const booking = bookingId ? await getBooking(bookingId) : null;
  if (!booking) return Response.json({ ok: false, message: "Booking not found." }, { status: 404 });

  const origin = req.nextUrl.origin || SITE.url;
  try {
    const intent = await createStripeCheckout({
      lineItems: [{ name: `${SITE.shortName} — ${booking.unitSlug}`, amountCents: booking.totalCents, quantity: 1 }],
      successUrl: `${origin}/book/return?booking=${booking.id}`,
      cancelUrl: `${origin}/book?cancelled=1`,
      reference: booking.id,
      customerEmail: booking.email,
    });
    await updateBookingStatus(booking.id, "pending");
    return Response.json({ ok: true, redirectUrl: intent.redirectUrl });
  } catch (err) {
    console.error("[stripe] error", err);
    return Response.json({ ok: false, message: "Could not start checkout." }, { status: 502 });
  }
}
