import type { NextRequest } from "next/server";
import { bookingSchema, fieldErrors } from "@/lib/validation";
import { computeQuote, resolveRoomPrices } from "@/lib/pricing";
import { getUnit } from "@/lib/units";
import { createBooking, getPricingConfig, isAvailable } from "@/lib/bookings-store";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { buildPayfastRedirect, createStripeCheckout, createOzowPayment, payfastConfigured, stripeConfigured, ozowConfigured } from "@/lib/payments";
import { SITE } from "@/lib/site";
import { notifyOwner } from "@/lib/notify";
import { emitBookingCreated } from "@/lib/queue/event-handlers";
import { verifyCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`book:${clientIp(req)}`, 10, 60_000);
  if (!rl.success) return tooMany(rl.reset);

  // CSRF protection
  const csrfResult = await verifyCsrfToken(req);
  if (csrfResult instanceof Response) {
    return csrfResult;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid request body." }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, message: "Please check the highlighted fields.", errors: fieldErrors(parsed.error) },
      { status: 422 },
    );
  }
  const input = parsed.data;
  const unit = getUnit(input.unitSlug);
  if (!unit) return Response.json({ ok: false, message: "Unknown apartment." }, { status: 404 });
  if (input.guests > unit.sleeps) {
    return Response.json(
      { ok: false, message: `This apartment sleeps a maximum of ${unit.sleeps} guests.` },
      { status: 422 },
    );
  }

  // Price is ALWAYS recomputed on the server — the client value is never trusted.
  const config = await getPricingConfig();
  const { lowCents, highCents } = resolveRoomPrices(unit.slug, unit.basePriceCents, config);
  const quote = computeQuote({ lowCents, highCents, checkIn: input.checkIn, checkOut: input.checkOut }, config);

  if (!quote.meetsMinimum) {
    return Response.json({ ok: false, message: quote.messages[0] ?? "Minimum stay not met." }, { status: 422 });
  }
  if (!(await isAvailable(input.unitSlug, input.checkIn, input.checkOut))) {
    return Response.json(
      { ok: false, message: "Sorry, those dates are no longer available.", errors: { checkIn: "Dates unavailable" } },
      { status: 409 },
    );
  }

  const booking = await createBooking({
    unitSlug: input.unitSlug,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    name: input.name,
    email: input.email,
    phone: input.phone,
    requests: input.requests ?? "",
    referral: input.referral ?? "",
    totalCents: quote.totalCents,
    depositCents: quote.depositCents,
    paymentMethod: input.paymentMethod,
    paymentRef: null,
  });

  // Emit booking created event for background jobs (welcome message, etc.)
  // Fire and forget - don't await to avoid blocking the response
  emitBookingCreated({
    bookingId: booking.id,
    guestName: input.name,
    email: input.email,
    phone: input.phone,
    unitSlug: input.unitSlug,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    specialRequests: input.requests ?? "",
    paymentMethod: input.paymentMethod,
    totalCents: quote.totalCents,
    depositCents: quote.depositCents,
  }).catch(err => console.error('[bookings] Failed to emit booking:created event', err));

  // Tell the owner immediately (Telegram / webhook / email) — never blocks the guest.
  await notifyOwner(`New ${input.paymentMethod === "enquiry" ? "enquiry" : "booking"} — ${unit.name}`, [
    `Guest: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    `Dates: ${input.checkIn} to ${input.checkOut} (${quote.nights} nights, ${input.guests} guests)`,
    `Total: R${(quote.totalCents / 100).toFixed(2)} · Deposit: R${(quote.depositCents / 100).toFixed(2)}`,
    input.requests ? `Notes: ${input.requests}` : "",
    `Ticket: ${SITE.url.replace(/\/$/, "")}/admin/enquiries?booking=${booking.id}`,
  ].filter(Boolean));

  const origin = req.nextUrl.origin || SITE.url;
  // Only the DEPOSIT is charged online; the balance is settled on arrival.
  const chargeCents = quote.depositCents > 0 ? quote.depositCents : quote.totalCents;
  const amount = (chargeCents / 100).toFixed(2);
  const label = quote.depositPercent > 0 && quote.depositPercent < 100
    ? `${quote.depositPercent}% deposit`
    : "Full payment";

  if (input.paymentMethod === "payfast" && payfastConfigured()) {
    const redirectUrl = buildPayfastRedirect(
      {
        merchant_id: process.env.PAYFAST_MERCHANT_ID!,
        merchant_key: process.env.PAYFAST_MERCHANT_KEY!,
        return_url: `${origin}/book/return?booking=${booking.id}`,
        cancel_url: `${origin}/book?cancelled=1`,
        notify_url: `${origin}/api/payments/payfast/notify`,
        name_first: input.name.split(" ")[0]!.slice(0, 100),
        email_address: input.email,
        m_payment_id: booking.id,
        amount,
        item_name: `${SITE.shortName} — ${unit.name} (${label})`,
        item_description: `${input.checkIn} to ${input.checkOut} (${quote.nights} nights)`,
        custom_str1: booking.id,
        custom_str2: unit.slug,
      },
      { passphrase: process.env.PAYFAST_PASSPHRASE, sandbox: process.env.PAYFAST_SANDBOX !== "false" },
    );
    return Response.json({ ok: true, bookingId: booking.id, redirectUrl, gateway: "payfast" });
  }

  if (input.paymentMethod === "stripe" && stripeConfigured()) {
    try {
      const intent = await createStripeCheckout({
        lineItems: [{ name: `${SITE.shortName} — ${unit.name} (${label})`, amountCents: chargeCents, quantity: 1 }],
        successUrl: `${origin}/book/return?booking=${booking.id}`,
        cancelUrl: `${origin}/book?cancelled=1`,
        reference: booking.id,
        customerEmail: input.email,
      });
      return Response.json({ ok: true, bookingId: booking.id, redirectUrl: intent.redirectUrl, gateway: "stripe" });
    } catch (err) {
      console.error("[bookings] Stripe error", err);
      return Response.json({ ok: true, bookingId: booking.id, message: "Booking held — we'll email a secure payment link shortly." });
    }
  }

  if (input.paymentMethod === "ozow" && ozowConfigured()) {
    try {
      const nameParts = input.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? "Guest";
      const lastName = nameParts.slice(1).join(" ") ?? "User";
      const isTest = process.env.OZOW_IS_TEST !== "false";
      const siteCode = process.env.OZOW_SITE_CODE ?? "";

      const ozowResult = await createOzowPayment({
        siteCode,
        countryCode: "ZA",
        currencyCode: "ZAR",
        amount: (chargeCents / 100).toFixed(2),
        transactionReference: booking.id,
        bankReference: `KALIVA-${booking.id.slice(0, 8).toUpperCase()}`,
        isTest,
        notifyUrl: `${origin}/api/payments/ozow/notify`,
        returnUrl: `${origin}/book/return?booking=${booking.id}&gateway=ozow`,
        cancelUrl: `${origin}/book?cancelled=1&gateway=ozow`,
        errorUrl: `${origin}/book?error=1&gateway=ozow`,
        customerFirstName: firstName,
        customerLastName: lastName,
        customerEmail: input.email,
        customerPhone: input.phone,
        customData: booking.id,
      });

      return Response.json({ ok: true, bookingId: booking.id, redirectUrl: ozowResult.url, gateway: "ozow" });
    } catch (err) {
      console.error("[bookings] Ozow error", err);
      return Response.json({ ok: true, bookingId: booking.id, message: "Booking held — we'll email a secure payment link shortly." });
    }
  }

  const note = payfastConfigured() || stripeConfigured()
    ? "Thank you — we've received your booking request and will email you to confirm."
    : "Thank you — we've received your request. Online payments are not configured yet, so we'll email you payment details.";
  return Response.json({ ok: true, bookingId: booking.id, message: note });
}
