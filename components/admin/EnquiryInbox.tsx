"use client";

import { useState } from "react";
import type { Booking, BookingStatus, EnquiryMessage } from "@/lib/bookings-store";
import { formatZAR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type Detail = { booking: Booking; messages: EnquiryMessage[] };

export default function EnquiryInbox({
  initialBookings,
  messageCounts,
  channels,
  initialDetail,
}: {
  initialBookings: Booking[];
  messageCounts: Record<string, number>;
  channels: string[];
  initialDetail: Detail | null;
}) {
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [bookings, setBookings] = useState(initialBookings);
  const [counts, setCounts] = useState(messageCounts);
  const [selected, setSelected] = useState<string | null>(initialBookings[0]?.id ?? null);
  const [detail, setDetail] = useState<Detail | null>(initialDetail);
  const [reply, setReply] = useState("");
  const [emailGuest, setEmailGuest] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function selectTicket(id: string) {
    setSelected(id);
    setPaymentUrl(null);
    setFlash(null);
    const res = await fetch(`/api/admin/enquiries?booking=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (res.ok) setDetail(await res.json());
  }

  async function setStatus(status: BookingStatus) {
    if (!selected) return;
    setBusy(true);
    const res = await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected, status }),
    });
    if (res.ok) {
      setBookings((b) => b.map((x) => (x.id === selected ? { ...x, status } : x)));
      setDetail((d) => (d ? { ...d, booking: { ...d.booking, status } } : d));
      setFlash(`Marked ${status}.`);
    }
    setBusy(false);
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/enquiries/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: selected, body: reply, emailGuest }),
    });
    const data = await res.json();
    if (res.ok) {
      setDetail((d) => (d ? { ...d, messages: [...d.messages, data.message] } : d));
      setCounts((c) => ({ ...c, [selected]: (c[selected] ?? 0) + 1 }));
      setReply("");
      setFlash(data.emailed ? "Reply saved and emailed to the guest." : "Reply saved (guest email not configured).");
    } else setFlash(data.message ?? "Could not save the reply.");
    setBusy(false);
  }

  async function makePaymentLink() {
    if (!selected) return;
    setBusy(true);
    const res = await fetch("/api/admin/enquiries/payment-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: selected }),
    });
    const data = await res.json();
    if (res.ok && data.url) {
      setPaymentUrl(data.url);
      setFlash("Deposit link ready — copy it and send to the guest.");
    } else setFlash(data.message ?? "Could not create a payment link.");
    setBusy(false);
  }

  const visible = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500";

  return (
    <div>
      {channels.length === 0 ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No notification channel is set up yet — you won&apos;t be told about new enquiries. Add Telegram or a
          webhook in <code className="font-mono">.env.local</code> (see README) and restart.
        </p>
      ) : (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          New enquiries are sent to: {channels.join(", ")}.
        </p>
      )}
      {flash && <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{flash}</p>}

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ticket list */}
        <div>
          <div className="flex gap-1">
            {(["all", "pending", "confirmed", "cancelled"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                  filter === f ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
                }`}>
                {f}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-2">
            {visible.map((b) => (
              <li key={b.id}>
                <button onClick={() => void selectTicket(b.id)}
                  className={`w-full rounded-xl border bg-white px-3 py-3 text-left shadow-sm ${
                    selected === b.id ? "border-brand-500 ring-1 ring-brand-300" : "border-slate-200"
                  }`}>
                  <span className="flex items-center justify-between">
                    <span className="truncate text-sm font-semibold text-slate-800">{b.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      b.status === "confirmed" ? "bg-emerald-100 text-emerald-800"
                      : b.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                      {b.status}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {b.unitSlug} · {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {formatZAR(b.totalCents)}
                    {counts[b.id] ? ` · ${counts[b.id]} message${counts[b.id] === 1 ? "" : "s"}` : ""}
                  </span>
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="text-sm text-slate-500">No tickets here.</li>}
          </ul>
        </div>

        {/* detail */}
        {detail ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{detail.booking.name}</h2>
                <p className="text-sm text-slate-500">{detail.booking.email} · {detail.booking.phone}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setStatus("confirmed")} disabled={busy}>Confirm</Button>
                <Button variant="secondary" onClick={() => setStatus("cancelled")} disabled={busy}>Cancel</Button>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
              <div><dt className="text-slate-500">Apartment</dt><dd className="text-slate-800">{detail.booking.unitSlug}</dd></div>
              <div><dt className="text-slate-500">Dates</dt><dd className="text-slate-800">{formatDate(detail.booking.checkIn)} → {formatDate(detail.booking.checkOut)}</dd></div>
              <div><dt className="text-slate-500">Guests</dt><dd className="text-slate-800">{detail.booking.guests}</dd></div>
              <div><dt className="text-slate-500">Total</dt><dd className="text-slate-800">{formatZAR(detail.booking.totalCents)}</dd></div>
              <div><dt className="text-slate-500">Deposit</dt><dd className="text-slate-800">{formatZAR(detail.booking.depositCents ?? 0)}</dd></div>
              <div><dt className="text-slate-500">Balance</dt><dd className="text-slate-800">{formatZAR(detail.booking.totalCents - (detail.booking.depositCents ?? 0))}</dd></div>
            </dl>

            {detail.booking.requests && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium">Guest note:</span> {detail.booking.requests}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={makePaymentLink} disabled={busy}>Create deposit payment link</Button>
              {paymentUrl && (
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-700 underline">
                  Open / copy link ↗
                </a>
              )}
            </div>
            {paymentUrl && (
              <input readOnly value={paymentUrl} className={inputCls + " mt-2 font-mono text-xs"} onFocus={(e) => e.currentTarget.select()} />
            )}

            <h3 className="mt-6 text-sm font-semibold text-slate-900">Conversation</h3>
            <ul className="mt-3 space-y-2">
              {detail.messages.length === 0 && (
                <li className="text-sm text-slate-500">No replies yet. Send the first message below.</li>
              )}
              {detail.messages.map((m) => (
                <li key={m.id} className={`rounded-xl px-3 py-2 text-sm ${m.author === "admin" ? "bg-brand-50 text-brand-900" : "bg-slate-50 text-slate-700"}`}>
                  <span className="block text-xs font-medium opacity-70">{m.author === "admin" ? "You" : "Guest"} · {new Date(m.createdAt).toLocaleString("en-ZA")}</span>
                  {m.body}
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <textarea className={inputCls} rows={3} placeholder="Write a reply to the guest…"
                value={reply} onChange={(e) => setReply(e.target.value)} />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={emailGuest} onChange={(e) => setEmailGuest(e.target.checked)} />
                  Also email this reply to the guest
                </label>
                <Button onClick={sendReply} disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Send reply"}</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Select a ticket to see the details.
          </div>
        )}
      </div>
    </div>
  );
}
