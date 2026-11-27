import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { listBookings, summariseRevenue, updateBookingStatus, type BookingStatus } from "@/lib/bookings-store";

export const dynamic = "force-dynamic";

const STATUSES: BookingStatus[] = ["pending", "confirmed", "cancelled"];

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  const bookings = await listBookings();
  return Response.json({ ok: true, bookings, summary: summariseRevenue(bookings) });
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  const { id, status } = (await req.json().catch(() => ({}))) as { id?: string; status?: BookingStatus };
  if (!id || !status || !STATUSES.includes(status)) {
    return Response.json({ ok: false, message: "Invalid booking update." }, { status: 422 });
  }
  const ok = await updateBookingStatus(id, status);
  return Response.json({ ok }, { status: ok ? 200 : 404 });
}
