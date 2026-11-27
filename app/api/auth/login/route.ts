import type { NextRequest } from "next/server";
import { loginSchema, fieldErrors } from "@/lib/validation";
import { createSession, verifyCredentials } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { verifyCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = rateLimit(`login:${clientIp(req)}`, 5, 5 * 60_000);
  if (!rl.success) return tooMany(rl.reset);

  // CSRF protection
  const csrfResult = await verifyCsrfToken(req);
  if (csrfResult instanceof Response) {
    return csrfResult;
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ ok: false, errors: fieldErrors(parsed.error) }, { status: 422 });
  }
  const ok = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!ok) {
    // Generic message — never reveal whether the email or password was wrong.
    return Response.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }
  await createSession(parsed.data.email);
  return Response.json({ ok: true, redirect: safeNextPath(parsed.data.next) });
}
