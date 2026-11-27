import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getDraft, saveDraft, publish, resetDraft } from "@/lib/builder/store";
import { layoutSchema, cleanLayout } from "@/lib/builder/schema";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PAGE = /^[a-z0-9-]{1,50}$/;

function pageOf(req: NextRequest): string | null {
  const p = req.nextUrl.searchParams.get("page") ?? "home";
  return PAGE.test(p) ? p : null;
}

export async function GET(req: NextRequest) {
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });
  const page = pageOf(req);
  if (!page) return Response.json({ ok: false, message: "Invalid page." }, { status: 400 });
  return Response.json({ ok: true, layout: await getDraft(page) });
}

export async function PUT(req: NextRequest) {
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });
  const rl = rateLimit(`site:${clientIp(req)}`, 60, 60_000);
  if (!rl.success) return tooMany(rl.reset);

  const page = pageOf(req);
  if (!page) return Response.json({ ok: false, message: "Invalid page." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = layoutSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid layout." },
      { status: 422 },
    );
  }
  const layout = await saveDraft(page, cleanLayout({ ...parsed.data, page }));
  return Response.json({ ok: true, layout });
}

export async function POST(req: NextRequest) {
  // Publish or reset, via ?action=publish|reset
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });
  const page = pageOf(req);
  if (!page) return Response.json({ ok: false, message: "Invalid page." }, { status: 400 });
  const action = req.nextUrl.searchParams.get("action");
  if (action === "publish") {
    const layout = await publish(page);
    return Response.json({ ok: true, layout, message: "Published." });
  }
  if (action === "reset") {
    const layout = await resetDraft(page);
    return Response.json({ ok: true, layout, message: "Reset to default." });
  }
  return Response.json({ ok: false, message: "Unknown action." }, { status: 400 });
}
