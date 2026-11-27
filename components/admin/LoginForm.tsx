"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

export default function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Fetch CSRF token from API
      const csrfRes = await fetch("/api/csrf", { credentials: "include" });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.token;
      
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { 
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {})
        },
        body: JSON.stringify({ email, password, next: next ?? "/admin" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Sign-in failed.");
        return;
      }
      window.location.href = data.redirect ?? "/admin";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Email</span>
        <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-700">Password</span>
        <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
