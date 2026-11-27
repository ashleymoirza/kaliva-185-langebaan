import type { NextRequest } from "next/server";
import { availabilityQuerySchema, fieldErrors } from "@/lib/validation";
import { getUnit } from "@/lib/units";
import { unavailableDates } from "@/lib/bookings-store";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`avail:${clientIp(req)}`, 120, 60_000);
  if (!rl.success) return tooMany(rl.reset);

  const parsed = availabilityQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Invalid query", errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  if (!getUnit(parsed.data.unitSlug)) {
    return Response.json({ error: "Unknown apartment" }, { status: 404 });
  }
  const unavailable = await unavailableDates(parsed.data.unitSlug);
  return Response.json({ unitSlug: parsed.data.unitSlug, unavailable });
}
