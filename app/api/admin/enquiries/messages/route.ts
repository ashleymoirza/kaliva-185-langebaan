import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { addMessage, getBooking } from "@/lib/bookings-store";
import { sendGuestEmail } from "@/lib/notify";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });
  const rl = rateLimit(`msg:${clientIp(req)}`, 60, 60_000);
  if (!rl.success) return tooMany(rl.reset);

  const body = (await req.json().catch(() => ({}))) as { bookingId?: string; body?: string; emailGuest?: boolean };
  if (!body.bookingId || !body.body || body.body.trim().length < 1) {
    return Response.json({ ok: false, message: "Write a reply first." }, { status: 422 });
  }
  const booking = await getBooking(body.bookingId);
  if (!booking) return Response.json({ ok: false, message: "Ticket not found." }, { status: 404 });

  const message = await addMessage(body.bookingId, "admin", body.body.trim());
  let emailed = false;
  if (body.emailGuest) {
    emailed = await sendGuestEmail(booking.email, `Re: your enquiry — Kaliva 185 Langebaan`, body.body.trim());
  }
  return Response.json({ ok: true, message, emailed });
}
