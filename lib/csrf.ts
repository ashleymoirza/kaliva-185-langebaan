// Server-only CSRF token management
// Uses HMAC with session secret for stateless tokens

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

const CSRF_COOKIE = "kaliva_csrf";
const CSRF_HEADER = "x-csrf-token";
const TOKEN_BYTES = 32;

function secretKey(): Uint8Array {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("ADMIN_SESSION_SECRET must be set (min 32 chars).");
  return new TextEncoder().encode(s);
}

function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

function signToken(token: string): string {
  const hmac = createHmac("sha256", secretKey());
  hmac.update(token);
  return hmac.digest("base64url");
}

function verifyToken(token: string, signature: string): boolean {
  const expectedSig = signToken(token);
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
}

/**
 * Get or create a CSRF token for the current session.
 * Call this in server components or route handlers before rendering forms.
 */
export async function getCsrfToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  
  if (existing) {
    const [token, sig] = existing.split(".");
    if (token && sig && verifyToken(token, sig)) {
      return token;
    }
  }
  
  // Generate new token
  const token = generateToken();
  const signature = signToken(token);
  const value = `${token}.${signature}`;
  
  store.set(CSRF_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  
  return token;
}

/**
 * Verify a CSRF token from a request header or form field.
 * Call this in route handlers before processing mutating requests.
 * Returns the token if valid, or a Response with 403 if invalid.
 */
export async function verifyCsrfToken(request: Request): Promise<string | Response> {
  const store = await cookies();
  const cookieValue = store.get(CSRF_COOKIE)?.value;
  
  if (!cookieValue) {
    return new Response("CSRF token missing", { status: 403 });
  }
  
  const [token, sig] = cookieValue.split(".");
  if (!token || !sig || !verifyToken(token, sig)) {
    return new Response("Invalid CSRF token", { status: 403 });
  }
  
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken || headerToken !== token) {
    return new Response("CSRF token mismatch", { status: 403 });
  }
  
  return token;
}

/**
 * Clear the CSRF token cookie (on logout).
 */
export async function clearCsrfToken(): Promise<void> {
  const store = await cookies();
  store.delete(CSRF_COOKIE);
}