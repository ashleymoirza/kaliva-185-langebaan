"use client";

import { useState } from "react";
import type { PricingConfig, RoomPrice } from "@/lib/pricing";
import type { BlockedDate } from "@/lib/bookings-store";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface RoomRow {
  slug: string;
  name: string;
  propertyName: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function RatesManager({
  initialConfig,
  rooms,
  initialBlocked,
}: {
  initialConfig: PricingConfig;
  rooms: RoomRow[];
  initialBlocked: BlockedDate[];
}) {
  const [config, setConfig] = useState<PricingConfig>(initialConfig);
  const [blocked, setBlocked] = useState<BlockedDate[]>(initialBlocked);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // rand strings for the price inputs, keyed by room slug
  const [low, setLow] = useState<Record<string, string>>(() =>
    Object.fromEntries(rooms.map((r) => {
      const rp = config.roomPrices?.[r.slug];
      return [r.slug, rp ? String(Math.round(rp.lowCents / 100)) : ""];
    })),
  );
  const [high, setHigh] = useState<Record<string, string>>(() =>
    Object.fromEntries(rooms.map((r) => {
      const rp = config.roomPrices?.[r.slug];
      return [r.slug, rp ? String(Math.round(rp.highCents / 100)) : ""];
    })),
  );

  const [blockRoom, setBlockRoom] = useState(rooms[0]?.slug ?? "");
  const [blockFrom, setBlockFrom] = useState("");
  const [blockTo, setBlockTo] = useState("");
  const [blockReason, setBlockReason] = useState("Not available");

  function toggleMonth(m: number) {
    setConfig((c) => {
      const set = new Set(c.highSeasonMonths);
      if (set.has(m)) set.delete(m);
      else set.add(m);
      return { ...c, highSeasonMonths: [...set].sort((a, b) => a - b) };
    });
  }

  async function saveConfig() {
    setBusy(true);
    setFlash(null);
    const roomPrices: Record<string, RoomPrice> = {};
    for (const r of rooms) {
      const l = Number(low[r.slug]);
      const h = Number(high[r.slug]);
      if (Number.isFinite(l) && l > 0) {
        roomPrices[r.slug] = { lowCents: Math.round(l * 100), highCents: Math.round((Number.isFinite(h) && h > 0 ? h : l) * 100) };
      }
    }
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        depositPercent: config.depositPercent,
        highSeasonMonths: config.highSeasonMonths,
        weekendSurcharge: config.weekendSurcharge,
        minNightsLow: config.minNightsLow,
        minNightsPeak: config.minNightsPeak,
        cleaningFeeCents: config.cleaningFeeCents,
        roomPrices,
      }),
    });
    const data = await res.json();
    if (res.ok && data.config) {
      setConfig(data.config);
      setFlash("Saved. New prices apply immediately.");
    } else {
      setFlash(data.message ?? "Could not save.");
    }
    setBusy(false);
  }

  async function blockDates() {
    if (!blockRoom || !blockFrom || !blockTo) {
      setFlash("Choose a room and both dates.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitSlug: blockRoom, from: blockFrom, to: blockTo, reason: blockReason || "Not available" }),
    });
    if (res.ok) {
      const list = await fetch("/api/admin/block").then((r) => r.json());
      setBlocked(list.blocked ?? []);
      setFlash("Dates marked unavailable.");
    } else setFlash("Could not block those dates.");
    setBusy(false);
  }

  async function unblock(slug: string, date: string) {
    setBusy(true);
    await fetch("/api/admin/block", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitSlug: slug, from: date, to: date }),
    });
    setBlocked((b) => b.filter((x) => !(x.unitSlug === slug && x.date === date)));
    setBusy(false);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500";

  return (
    <div className="space-y-6">
      {flash && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{flash}</p>}

      {/* 1. Prices */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">1. Nightly prices</h2>
        <p className="mt-1 text-sm text-slate-500">
          Type the price in Rand for each room in low and high season. Leave a room blank to keep its built-in price.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-2">Room</th><th className="py-2">Guest house</th><th className="py-2">Low season (R)</th><th className="py-2">High season (R)</th></tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.slug} className="border-t border-slate-50">
                  <td className="py-2 pr-3 font-medium text-slate-800">{r.name}</td>
                  <td className="py-2 pr-3 text-slate-500">{r.propertyName}</td>
                  <td className="py-2 pr-3">
                    <input type="number" min={0} step={10} className={inputCls} placeholder="e.g. 950"
                      value={low[r.slug] ?? ""} onChange={(e) => setLow({ ...low, [r.slug]: e.target.value })} />
                  </td>
                  <td className="py-2">
                    <input type="number" min={0} step={10} className={inputCls} placeholder="e.g. 1400"
                      value={high[r.slug] ?? ""} onChange={(e) => setHigh({ ...high, [r.slug]: e.target.value })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. High season */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">2. Which months are high season</h2>
        <p className="mt-1 text-sm text-slate-500">Tap the months that should use the high-season price.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MONTHS.map((label, i) => {
            const m = i + 1;
            const on = config.highSeasonMonths.includes(m);
            return (
              <button key={m} type="button" onClick={() => toggleMonth(m)}
                className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ${
                  on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-brand-300"
                }`}>
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Deposit + rules */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">3. Deposit &amp; booking rules</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Deposit taken online (%)</span>
            <input type="number" min={0} max={100} className={inputCls} value={config.depositPercent}
              onChange={(e) => setConfig({ ...config, depositPercent: Number(e.target.value) })} />
            <span className="mt-1 block text-xs text-slate-400">50 = guests pay half now, half on arrival.</span>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Weekend extra (fraction)</span>
            <input type="number" step="0.05" min={0} max={2} className={inputCls} value={config.weekendSurcharge}
              onChange={(e) => setConfig({ ...config, weekendSurcharge: Number(e.target.value) })} />
            <span className="mt-1 block text-xs text-slate-400">0.15 = +15% on Fri &amp; Sat.</span>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Minimum nights (low)</span>
            <input type="number" min={1} max={30} className={inputCls} value={config.minNightsLow}
              onChange={(e) => setConfig({ ...config, minNightsLow: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Minimum nights (high)</span>
            <input type="number" min={1} max={30} className={inputCls} value={config.minNightsPeak}
              onChange={(e) => setConfig({ ...config, minNightsPeak: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Cleaning fee (R)</span>
            <input type="number" min={0} className={inputCls} value={Math.round(config.cleaningFeeCents / 100)}
              onChange={(e) => setConfig({ ...config, cleaningFeeCents: Math.round(Number(e.target.value) * 100) })} />
          </label>
        </div>
        <div className="mt-5">
          <Button onClick={saveConfig} disabled={busy}>{busy ? "Saving…" : "Save prices & rules"}</Button>
        </div>
      </section>

      {/* 4. Availability */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">4. Availability</h2>
        <p className="mt-1 text-sm text-slate-500">
          Mark dates as unavailable (maintenance, owner stays, already booked elsewhere). Guests won&apos;t be able to book them.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Room</span>
            <select className={inputCls} value={blockRoom} onChange={(e) => setBlockRoom(e.target.value)}>
              {rooms.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">From</span>
            <input type="date" className={inputCls} value={blockFrom} onChange={(e) => setBlockFrom(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">To</span>
            <input type="date" className={inputCls} value={blockTo} onChange={(e) => setBlockTo(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Reason</span>
            <input className={inputCls} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
          </label>
        </div>
        <div className="mt-3">
          <Button onClick={blockDates} disabled={busy} variant="secondary">Mark unavailable</Button>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">Currently unavailable</h3>
          {blocked.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing blocked — all dates are open.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {blocked.map((b, i) => (
                <li key={`${b.unitSlug}-${b.date}-${i}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-700">
                    {formatDate(b.date)} <span className="text-xs text-slate-500">· {b.unitSlug} · {b.reason}</span>
                  </span>
                  <button onClick={() => unblock(b.unitSlug, b.date)} disabled={busy} className="text-xs text-brand-700 hover:underline">
                    Re-open
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
