import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { pricingOverrideSchema, fieldErrors } from "@/lib/validation";
import { getPricingConfig, savePricingConfig } from "@/lib/bookings-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, config: await getPricingConfig() });
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  const parsed = pricingOverrideSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ ok: false, errors: fieldErrors(parsed.error) }, { status: 422 });
  }
  const config = await savePricingConfig(parsed.data);
  return Response.json({ ok: true, config });
}
