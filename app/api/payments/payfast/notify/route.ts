import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { getBooking, updateBookingStatus } from "@/lib/bookings-store";
import { notifyOwner } from "@/lib/notify";

export const dynamic = "force-dynamic";

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

/**
 * PayFast Instant Transaction Notification (ITN) handler.
 * Verifies the payload signature and amount before confirming the booking.
 *
 * PRODUCTION HARDENING (documented, not yet enforced):
 *  1. Confirm the source IP is in PayFast's published host list.
 *  2. Post the payload back to PayFast's /eng/query/validate endpoint and require "VALID".
 *  3. Enable the passphrase in the PayFast dashboard and verify it here.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const params = new URLSearchParams(raw);

  const received = params.get("signature") ?? "";
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";

  // Rebuild the field string in the order received, excluding `signature`.
  const ordered: string[] = [];
  for (const [k, v] of params.entries()) {
    if (k === "signature") continue;
    ordered.push(`${encodeURIComponent(k).replace(/%20/g, "+")}=${encodeURIComponent(v).replace(/%20/g, "+")}`);
  }
  const base = ordered.join("&");
  const expected = md5(passphrase ? `${base}&passphrase=${encodeURIComponent(passphrase)}` : base);

  if (!received || received !== expected) {
    console.warn("[payfast] ITN signature mismatch");
    return new Response("Invalid signature", { status: 400 });
  }

  const bookingId = params.get("m_payment_id") ?? params.get("custom_str1") ?? "";
  const pfStatus = params.get("payment_status") ?? "";
  const amountGross = Number(params.get("amount_gross") ?? "0");
  const booking = bookingId ? await getBooking(bookingId) : null;

  if (!booking) {
    console.warn("[payfast] ITN for unknown booking", bookingId);
    return new Response("Unknown booking", { status: 404 });
  }

  // Amount tamper check (allow 1 cent rounding).
  if (Math.abs(amountGross * 100 - booking.totalCents) > 1) {
    console.warn("[payfast] ITN amount mismatch", amountGross, booking.totalCents);
    return new Response("Amount mismatch", { status: 400 });
  }

  if (pfStatus === "COMPLETE") {
    await updateBookingStatus(booking.id, "confirmed");
    await notifyOwner(`💳 Deposit paid — ${booking.unitSlug}`, [
      `Guest: ${booking.name} (${booking.email})`,
      `Dates: ${booking.checkIn} to ${booking.checkOut}`,
      `Deposit received: R${(amountGross).toFixed(2)}`,
      `Balance due on arrival: R${((booking.totalCents - booking.depositCents!)/100).toFixed(2)}`,
    ]);
  } else if (pfStatus === "CANCELLED") {
    await updateBookingStatus(booking.id, "cancelled");
  }
  return new Response("OK", { status: 200 });
}
