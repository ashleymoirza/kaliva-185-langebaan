// Server-only module (imported exclusively from Server Components / Route Handlers).
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

const COOKIE = "kaliva_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secretKey(): Uint8Array | null {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) return null;
  return new TextEncoder().encode(s);
}

export interface AdminSession {
  email: string;
  role: "admin";
}

export async function createSession(email: string): Promise<void> {
  const key = secretKey();
  if (!key) throw new Error("ADMIN_SESSION_SECRET must be set (min 32 chars).");
  const token = await new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const key = secretKey();
  if (!key) return null;
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (payload.role !== "admin" || typeof payload.email !== "string") return null;
    return { email: payload.email, role: "admin" };
  } catch {
    return null;
  }
}

/** Use inside server components/route handlers to gate admin-only content. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * Verify credentials against the env-configured single admin account.
 * The password is compared as a bcrypt hash — no plaintext password is stored.
 */
export async function verifyCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const hash = process.env.ADMIN_PASSWORD_HASH ?? "";
  if (!expectedEmail || !hash) {
    console.warn("[auth] ADMIN_EMAIL / ADMIN_PASSWORD_HASH not configured.");
    return false;
  }
  const emailOk = email.toLowerCase().trim() === expectedEmail;
  // Always run a bcrypt compare to keep timing roughly constant.
  const passOk = await bcrypt.compare(password, hash);
  return emailOk && passOk;
}
