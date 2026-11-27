"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Booking, BookingStatus } from "@/lib/bookings-store";
import { formatZAR, formatDate } from "@/lib/utils";

type Tab = "overview" | "bookings";

export default function AdminDashboard({ initialBookings }: { initialBookings: Booking[] }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [bookings, setBookings] = useState(initialBookings);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const router = useRouter();

  const summary = useMemo(() => {
    const paid = bookings.filter((b) => b.status !== "cancelled");
    const byDay = new Map<string, { label: string; bookings: number; grossCents: number }>();
    for (const b of paid) {
      const label = b.createdAt.slice(0, 10);
      const cur = byDay.get(label) ?? { label, bookings: 0, grossCents: 0 };
      cur.bookings += 1;
      cur.grossCents += b.totalCents;
      byDay.set(label, cur);
    }
    const byStatus = { pending: 0, confirmed: 0, cancelled: 0 };
    for (const b of bookings) byStatus[b.status] += 1;
    const byReferral = new Map<string, number>();
    for (const b of bookings) {
      const campaign = new URLSearchParams(b.referral.replace(/^\?/, "")).get("utm_campaign") ?? "direct";
      byReferral.set(campaign, (byReferral.get(campaign) ?? 0) + 1);
    }
    const deposits = bookings
      .filter((b) => b.status !== "cancelled")
      .reduce((s, b) => s + (b.depositCents ?? 0), 0);
    return {
      totalCents: paid.reduce((s, b) => s + b.totalCents, 0),
      deposits,
      count: bookings.length,
      byStatus,
      daily: [...byDay.values()].sort((a, b) => (a.label < b.label ? 1 : -1)).slice(0, 14),
      referrals: [...byReferral.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [bookings]);

  async function setStatus(id: string, status: BookingStatus) {
    setBusy(true);
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    setBusy(false);
    setFlash("Booking updated.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "bookings", label: "Bookings" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              tab === t.id ? "border-b-2 border-brand-600 text-brand-800" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto flex flex-wrap items-center gap-1 py-1">
          <Link href="/admin/enquiries" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Enquiries
          </Link>
          <Link href="/admin/rates" className="rounded-full px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
            Prices &amp; availability
          </Link>
          <Link href="/admin/properties" className="rounded-full px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
            Photos &amp; guest houses
          </Link>
          <Link href="/admin/builder" className="rounded-full px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
            Website builder
          </Link>
          <button onClick={logout} className="rounded-full px-4 py-2 text-sm text-slate-500 hover:text-red-600">
            Sign out
          </button>
        </span>
      </div>

      {flash && <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{flash}</p>}

      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Total value of bookings", formatZAR(summary.totalCents)],
              ["Deposits collected (50%)", formatZAR(summary.deposits)],
              ["Bookings", String(summary.count)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["pending", "confirmed", "cancelled"] as BookingStatus[]).map((s) => (
              <div key={s} className="rounded-xl bg-slate-50 p-4 text-sm">
                <span className="capitalize text-slate-500">{s}</span>
                <span className="ml-2 font-bold text-slate-900">{summary.byStatus[s]}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Bookings by day (last 14)</h3>
            {summary.daily.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No bookings yet.</p>
            ) : (
              <table className="mt-3 w-full text-sm">
                <tbody>
                  {summary.daily.map((d) => (
                    <tr key={d.label} className="border-t border-slate-50">
                      <td className="py-2 text-slate-600">{d.label}</td>
                      <td className="py-2 text-slate-500">{d.bookings} booking(s)</td>
                      <td className="py-2 text-right font-medium text-slate-800">{formatZAR(d.grossCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Where bookings came from (Meta ads)</h3>
            <ul className="mt-3 space-y-1 text-sm">
              {summary.referrals.length === 0 && <li className="text-slate-500">No data yet.</li>}
              {summary.referrals.map(([c, n]) => (
                <li key={c} className="flex justify-between text-slate-600"><span>{c}</span><span className="font-medium text-slate-800">{n}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "bookings" && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Apartment</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Total / deposit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No bookings yet.</td></tr>
              )}
              {bookings.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <span className="block font-medium text-slate-800">{b.name}</span>
                    <span className="text-xs text-slate-500">{b.email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.unitSlug}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</td>
                  <td className="px-4 py-3 text-slate-800">
                    {formatZAR(b.totalCents)}
                    {typeof b.depositCents === "number" && b.depositCents > 0 && (
                      <span className="block text-xs text-slate-500">deposit {formatZAR(b.depositCents)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.status === "confirmed" ? "bg-emerald-100 text-emerald-800"
                      : b.status === "cancelled" ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-800"}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <select className="rounded border border-slate-200 px-2 py-1 text-xs" value={b.status} disabled={busy}
                      onChange={(e) => setStatus(b.id, e.target.value as BookingStatus)}>
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
