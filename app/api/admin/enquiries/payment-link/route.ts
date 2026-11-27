import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getBooking } from "@/lib/bookings-store";
import { buildPayfastRedirect, payfastConfigured } from "@/lib/payments";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Create a deposit payment link for a ticket, to send the guest. */
export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });
  const { bookingId } = (await req.json().catch(() => ({}))) as { bookingId?: string };
  const booking = bookingId ? await getBooking(bookingId) : null;
  if (!booking) return Response.json({ ok: false, message: "Ticket not found." }, { status: 404 });
  if (!payfastConfigured()) {
    return Response.json(
      { ok: false, message: "PayFast isn't configured yet — add PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY to .env.local." },
      { status: 503 },
    );
  }
  const deposit = booking.depositCents && booking.depositCents > 0 ? booking.depositCents : booking.totalCents;
  const origin = req.nextUrl.origin || SITE.url;
  const url = buildPayfastRedirect(
    {
      merchant_id: process.env.PAYFAST_MERCHANT_ID!,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY!,
      return_url: `${origin}/book/return?booking=${booking.id}`,
      cancel_url: `${origin}/book?cancelled=1`,
      notify_url: `${origin}/api/payments/payfast/notify`,
      name_first: booking.name.split(" ")[0]!.slice(0, 100),
      email_address: booking.email,
      m_payment_id: booking.id,
      amount: (deposit / 100).toFixed(2),
      item_name: `${SITE.shortName} — deposit`,
      item_description: `${booking.checkIn} to ${booking.checkOut}`,
      custom_str1: booking.id,
      custom_str2: booking.unitSlug,
    },
    { passphrase: process.env.PAYFAST_PASSPHRASE, sandbox: process.env.PAYFAST_SANDBOX !== "false" },
  );
  return Response.json({ ok: true, url, depositCents: deposit });
}
