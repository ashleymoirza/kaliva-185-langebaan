import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getBooking, listBookings, listMessages } from "@/lib/bookings-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });

  const bookingId = req.nextUrl.searchParams.get("booking");
  if (bookingId) {
    const booking = await getBooking(bookingId);
    if (!booking) return Response.json({ ok: false, message: "Ticket not found." }, { status: 404 });
    return Response.json({ ok: true, booking, messages: await listMessages(bookingId) });
  }

  const bookings = await listBookings();
  const messages = await listMessages();
  const counts: Record<string, number> = {};
  for (const m of messages) counts[m.bookingId] = (counts[m.bookingId] ?? 0) + 1;
  return Response.json({ ok: true, bookings, messageCounts: counts });
}
