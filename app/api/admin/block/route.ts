import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { blockDatesSchema, fieldErrors } from "@/lib/validation";
import { addBlockedRange, listBlocked, removeBlockedRange } from "@/lib/bookings-store";
import { getUnit } from "@/lib/units";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, blocked: await listBlocked() });
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  const parsed = blockDatesSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ ok: false, errors: fieldErrors(parsed.error) }, { status: 422 });
  }
  if (!getUnit(parsed.data.unitSlug)) {
    return Response.json({ ok: false, message: "Unknown apartment." }, { status: 404 });
  }
  const count = await addBlockedRange(
    parsed.data.unitSlug,
    parsed.data.from,
    parsed.data.to,
    parsed.data.reason ?? "Blocked by admin",
  );
  return Response.json({ ok: true, blocked: count });
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  const parsed = blockDatesSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ ok: false, errors: fieldErrors(parsed.error) }, { status: 422 });
  }
  const count = await removeBlockedRange(parsed.data.unitSlug, parsed.data.from, parsed.data.to);
  return Response.json({ ok: true, unblocked: count });
}
