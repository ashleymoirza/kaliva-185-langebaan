import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { propertySchema, fieldErrors } from "@/lib/validation";
import { listProperties, upsertProperty, deleteProperty } from "@/lib/properties-store";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, properties: await listProperties() });
}

export async function PUT(req: NextRequest) {
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });
  const rl = rateLimit(`prop:${clientIp(req)}`, 60, 60_000);
  if (!rl.success) return tooMany(rl.reset);

  const parsed = propertySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) }, { status: 422 });
  }
  const saved = await upsertProperty(parsed.data);
  return Response.json({ ok: true, property: saved });
}

export async function DELETE(req: NextRequest) {
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) {
    return Response.json({ ok: false, message: "Invalid slug." }, { status: 400 });
  }
  await deleteProperty(slug);
  return Response.json({ ok: true });
}
