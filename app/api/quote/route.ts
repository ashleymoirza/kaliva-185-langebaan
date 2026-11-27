import type { NextRequest } from "next/server";
import { quoteQuerySchema, fieldErrors } from "@/lib/validation";
import { computeQuote, resolveRoomPrices } from "@/lib/pricing";
import { getUnit } from "@/lib/units";
import { getPricingConfig } from "@/lib/bookings-store";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rl = rateLimit(`quote:${clientIp(req)}`, 60, 60_000);
  if (!rl.success) return tooMany(rl.reset);

  const parsed = quoteQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Invalid query", errors: fieldErrors(parsed.error) }, { status: 400 });
  }
  const unit = getUnit(parsed.data.unitSlug);
  if (!unit) return Response.json({ error: "Unknown apartment" }, { status: 404 });

  const config = await getPricingConfig();
  const { lowCents, highCents } = resolveRoomPrices(unit.slug, unit.basePriceCents, config);
  const quote = computeQuote(
    { lowCents, highCents, checkIn: parsed.data.checkIn, checkOut: parsed.data.checkOut },
    config,
  );
  return Response.json({
    quote,
    unit: { slug: unit.slug, name: unit.name, sleeps: unit.sleeps },
  });
}
