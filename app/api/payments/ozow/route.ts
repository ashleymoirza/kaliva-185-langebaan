import type { NextRequest } from "next/server";
import { getBooking } from "@/lib/bookings-store";
import { createOzowPayment, ozowConfigured, type OzowFields } from "@/lib/payments";
import { SITE } from "@/lib/site";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`ozow:${clientIp(req)}`, 20, 60_000);
  if (!rl.success) return tooMany(rl.reset);

  if (!ozowConfigured()) {
    return Response.json({ ok: false, message: "Ozow is not configured." }, { status: 503 });
  }

  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  const booking = bookingId ? await getBooking(bookingId) : null;
  if (!booking) return Response.json({ ok: false, message: "Booking not found." }, { status: 404 });

  const origin = req.nextUrl.origin || SITE.url;
  const isTest = process.env.OZOW_IS_TEST !== "false";
  const siteCode = process.env.OZOW_SITE_CODE ?? "";

  // Split name into first/last
  const nameParts = booking.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "Guest";
  const lastName = nameParts.slice(1).join(" ") ?? "User";

  // Convert cents to major units with 2 decimals
  const amountMajor = (booking.totalCents / 100).toFixed(2);

  const fields: OzowFields = {
    siteCode,
    countryCode: "ZA",
    currencyCode: "ZAR",
    amount: amountMajor,
    transactionReference: booking.id,
    bankReference: `KALIVA-${booking.id.slice(0, 8).toUpperCase()}`,
    isTest,
    notifyUrl: `${origin}/api/payments/ozow/notify`,
    returnUrl: `${origin}/book/return?booking=${booking.id}&gateway=ozow`,
    cancelUrl: `${origin}/book?cancelled=1&gateway=ozow`,
    errorUrl: `${origin}/book?error=1&gateway=ozow`,
    customerFirstName: firstName,
    customerLastName: lastName,
    customerEmail: booking.email,
    customerPhone: booking.phone,
    customData: booking.id,
  };

  try {
    const result = await createOzowPayment(fields);

    // Create initial Payment record
    const db = await (await import("@/lib/db")).getDb();
    if (db) {
      try {
        await db.payment.create({
          data: {
            bookingId: booking.id,
            userId: booking.userId ?? "guest",
            amountCents: booking.totalCents,
            currency: "ZAR",
            method: "ozow",
            status: "pending",
            reference: `ozow_${result.paymentId}`,
            ozowPaymentId: result.paymentId,
            ozowSiteCode: siteCode,
            ozowCountryCode: "ZA",
            ozowCurrencyCode: "ZAR",
            ozowAmount: booking.totalCents / 100,
            ozowIsTest: isTest,
            ozowNotifyUrl: fields.notifyUrl,
            ozowReturnUrl: fields.returnUrl,
            ozowCancelUrl: fields.cancelUrl,
            ozowErrorUrl: fields.errorUrl,
            ozowHash: result.hash,
          },
        });
      } catch (err) {
        console.warn("[ozow] DB payment record creation failed", err);
      }
    }

    return Response.json({ ok: true, redirectUrl: result.url });
  } catch (err) {
    console.error("[ozow] error", err);
    return Response.json({ ok: false, message: "Could not start Ozow checkout." }, { status: 502 });
  }
}