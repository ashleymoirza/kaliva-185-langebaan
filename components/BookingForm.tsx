"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { trackMeta } from "@/lib/meta-pixel";
import { formatZAR, todayISO } from "@/lib/utils";
import type { Quote } from "@/lib/pricing";
import PricingBreakdown from "@/components/PricingBreakdown";
import { Button, LinkButton } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Container from "@/components/ui/Container";
import { cn } from "@/lib/utils";

export interface BookingUnitOption {
  slug: string;
  name: string;
  sleeps: number;
  basePriceCents: number;
}

interface BookingResult {
  ok: boolean;
  bookingId?: string;
  redirectUrl?: string;
  message?: string;
  errors?: Record<string, string>;
}

export default function BookingForm({
  units,
  defaultUnit,
}: {
  units: BookingUnitOption[];
  defaultUnit?: string;
}) {
  const [unitSlug, setUnitSlug] = useState(defaultUnit ?? units[0]?.slug ?? "");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"payfast" | "stripe" | "ozow" | "enquiry">("payfast");

  const [quoteData, setQuoteData] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ bookingId: string; message: string } | null>(null);
  const [step, setStep] = useState<"dates" | "details" | "payment">("dates");
  const startedRef = useRef(false);

  const min = todayISO();
  const selectedUnit = useMemo(() => units.find((u) => u.slug === unitSlug), [units, unitSlug]);
  const maxGuests = selectedUnit?.sleeps ?? 10;

  const markStarted = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackMeta("InitiateCheckout", { content_name: selectedUnit?.name, currency: "ZAR" });
  }, [selectedUnit]);

  // Availability for the chosen unit.
  useEffect(() => {
    if (!unitSlug) return;
    let active = true;
    fetch(`/api/availability?unitSlug=${encodeURIComponent(unitSlug)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { unavailable: [] }))
      .then((d: { unavailable?: string[] }) => {
        if (active) setUnavailable(d.unavailable ?? []);
      })
      .catch(() => active && setUnavailable([]));
    return () => {
      active = false;
    };
  }, [unitSlug]);

  // Live quote whenever unit/dates/guests change.
  const rangeValid = Boolean(unitSlug && checkIn && checkOut && checkOut > checkIn);
  const quote = rangeValid ? quoteData : null;

  useEffect(() => {
    if (!rangeValid) return;
    const ctrl = new AbortController();
    const params = new URLSearchParams({ unitSlug, checkIn, checkOut, guests: String(guests) });
    const t = setTimeout(() => {
      setLoadingQuote(true);
      fetch(`/api/quote?${params.toString()}`, { signal: ctrl.signal, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("quote failed"))))
        .then((d: { quote?: Quote }) => setQuoteData(d.quote ?? null))
        .catch(() => {
          /* aborted or failed — leave previous quote */
        })
        .finally(() => setLoadingQuote(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [unitSlug, checkIn, checkOut, guests, rangeValid]);

  const blockedInRange = useMemo(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return [];
    const blocked = new Set(unavailable);
    const out: string[] = [];
    const cur = new Date(`${checkIn}T00:00:00Z`);
    const end = Date.parse(`${checkOut}T00:00:00Z`);
    while (cur.getTime() < end) {
      const iso = cur.toISOString().slice(0, 10);
      if (blocked.has(iso)) out.push(iso);
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
  }, [unavailable, checkIn, checkOut]);

  const canProceedFromDates =
    !!selectedUnit && checkIn && checkOut && checkOut > checkIn && blockedInRange.length === 0;
  const canProceedFromDetails = name.trim() && email.trim() && phone.trim() && acceptTerms;
  const canSubmit = quote?.meetsMinimum && acceptTerms && blockedInRange.length === 0 && !submitting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    if (blockedInRange.length > 0) {
      setErrors({ checkIn: "Some of those dates are no longer available." });
      return;
    }
    setSubmitting(true);
    try {
      const csrfRes = await fetch("/api/csrf", { credentials: "include" });
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.token;

      const res = await fetch("/api/bookings", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        },
        body: JSON.stringify({
          unitSlug,
          checkIn,
          checkOut,
          guests,
          name,
          email,
          phone,
          requests,
          acceptTerms,
          paymentMethod,
          referral: typeof window !== "undefined" ? window.location.search.slice(0, 300) : "",
        }),
      });
      const data: BookingResult = await res.json();
      if (!res.ok || !data.ok) {
        setErrors(data.errors ?? { _: data.message ?? "Something went wrong. Please try again." });
        return;
      }
      if (data.redirectUrl) {
        trackMeta("Purchase", { currency: "ZAR", value: (quote?.depositCents ?? quote?.totalCents ?? 0) / 100 });
        window.location.href = data.redirectUrl;
        return;
      }
      trackMeta("Lead", { currency: "ZAR", value: (quote?.totalCents ?? 0) / 100 });
      setDone({ bookingId: data.bookingId ?? "", message: data.message ?? "Request received." });
    } catch {
      setErrors({ _: "Network error. Please check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = cn(
    "input-base",
    "w-full"
  );

  const labelCls = "label-base";

  if (done) {
    return (
      <Container size="md" className="py-20">
        <div className="rounded-2xl border border-success-200 bg-success-50 p-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-success-100 text-success-600 mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-success-900 font-airbnb">Thank you — request received</h2>
          <p className="mt-3 text-slate-700 max-w-md mx-auto font-airbnb">{done.message}</p>
          {done.bookingId && (
            <p className="mt-4 text-sm text-success-700 font-mono">Reference: {done.bookingId.slice(0, 8).toUpperCase()}</p>
          )}
          <p className="mt-6 text-sm text-slate-600 font-airbnb">We&apos;ll email {email} to confirm availability and next steps.</p>
          <LinkButton href="/" variant="stripe-primary" size="lg" className="mt-8 inline-flex">
            Back to home
          </LinkButton>
        </div>
      </Container>
    );
  }

  const nights = quote?.nights ?? (checkIn && checkOut ? Math.ceil((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000) : 0);

  return (
    <Container size="xl" className="py-14">
      <header className="mb-10">
        <Badge variant="brand" className="mb-4 inline-flex">Kaliva 185 Langebaan</Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 font-airbnb">Book your stay</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600 font-airbnb">
          Choose your dates to see a live, all-inclusive price. Pay securely with PayFast, Stripe or Ozow,
          or send an enquiry to pay later.
        </p>
      </header>

      {/* Progress indicator */}
      <div className="mb-10 hidden lg:flex items-center justify-between">
        {["dates", "details", "payment"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all font-airbnb",
              step === s || (i < ["dates", "details", "payment"].indexOf(step))
                ? "bg-brand-600 text-white"
                : "bg-sand-100 text-sand-500"
            )}>
              {i + 1}
            </div>
            <span className={cn("ml-2 text-sm font-medium font-airbnb", step === s ? "text-brand-700" : "text-slate-500")}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 2 && <div className={cn("hidden w-20 h-0.5 mx-2 rounded", step !== "dates" ? "bg-brand-600" : "bg-sand-200")} />}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.5fr_1fr]" onChange={markStarted}>
        <div className="space-y-6">
          {/* Step 1: Dates & Unit */}
          {step === "dates" && (
            <fieldset className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card transition-shadow-card card-airbnb">
              <legend className="px-2 text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2 font-airbnb">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-sm">1</span>
                Your stay
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  <span className={labelCls}>Apartment</span>
                  <select className={cn(inputCls, "appearance-none bg-no-repeat bg-right pr-10", "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")] bg-center")} value={unitSlug} onChange={(e) => setUnitSlug(e.target.value)}>
                    {units.map((u) => (
                      <option key={u.slug} value={u.slug}>
                        {u.name} · sleeps {u.sleeps} · from {formatZAR(u.basePriceCents)}/night
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className={labelCls}>Check-in</span>
                  <input
                    type="date"
                    className={cn(inputCls, errors.checkIn && "border-error-500 focus:border-error-500 focus:ring-error-500/20")}
                    min={min}
                    value={checkIn}
                    onChange={(e) => { setCheckIn(e.target.value); if (!checkOut || e.target.value >= checkOut) setCheckOut(""); }}
                    aria-invalid={!!errors.checkIn}
                  />
                  {errors.checkIn && <span className="mt-1.5 text-xs text-error-600 flex items-center gap-1 font-airbnb"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors.checkIn}</span>}
                </label>
                <label className="text-sm">
                  <span className={labelCls}>Check-out</span>
                  <input
                    type="date"
                    className={cn(inputCls, errors.checkOut && "border-error-500 focus:border-error-500 focus:ring-error-500/20")}
                    min={checkIn || min}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    aria-invalid={!!errors.checkOut}
                  />
                </label>
                <label className="text-sm">
                  <span className={labelCls}>Guests</span>
                  <input
                    type="number"
                    className={inputCls}
                    min={1}
                    max={maxGuests}
                    value={guests}
                    onChange={(e) => setGuests(Math.min(maxGuests, Math.max(1, Number(e.target.value))))}
                  />
                </label>
              </div>
              {blockedInRange.length > 0 && (
                <div className="mt-4 rounded-xl bg-error-50 p-3.5 flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-error-500 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div className="text-sm text-error-700 font-airbnb">Some selected dates are unavailable. Please choose different dates.</div>
                </div>
              )}
              {quote && (
                <div className="mt-5 p-4 rounded-xl bg-sand-50 border border-sand-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 font-airbnb">{nights} night{nights !== 1 ? "s" : ""} stay</p>
                        <p className="text-xs text-slate-500 font-airbnb">{formatZAR(quote.totalCents)} total</p>
                      </div>
                    </div>
                    <Badge variant="success">{formatZAR(quote.totalCents)}</Badge>
                  </div>
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <Button type="button" variant="stripe-ghost" size="lg" className="flex-1" onClick={() => setStep("details")} disabled={!canProceedFromDates}>
                  Continue to guest details
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Button>
              </div>
            </fieldset>
          )}

          {/* Step 2: Guest Details */}
          {step === "details" && (
            <fieldset className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card transition-shadow-card card-airbnb">
              <legend className="px-2 text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2 font-airbnb">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-sm">2</span>
                Guest details
              </legend>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm">
                  <span className={cn(labelCls, errors.name && "text-error-600")}>Full name</span>
                  <input className={cn(inputCls, errors.name && "border-error-500 focus:border-error-500 focus:ring-error-500/20")} value={name} onChange={(e) => setName(e.target.value)} required />
                  {errors.name && <span className="mt-1.5 text-xs text-error-600 flex items-center gap-1 font-airbnb"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors.name}</span>}
                </label>
                <label className="text-sm">
                  <span className={cn(labelCls, errors.email && "text-error-600")}>Email</span>
                  <input type="email" className={cn(inputCls, errors.email && "border-error-500 focus:border-error-500 focus:ring-error-500/20")} value={email} onChange={(e) => setEmail(e.target.value)} required />
                  {errors.email && <span className="mt-1.5 text-xs text-error-600 flex items-center gap-1 font-airbnb"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors.email}</span>}
                </label>
                <label className="text-sm">
                  <span className={cn(labelCls, errors.phone && "text-error-600")}>Mobile number</span>
                  <input type="tel" className={cn(inputCls, errors.phone && "border-error-500 focus:border-error-500 focus:ring-error-500/20")} value={phone} onChange={(e) => setPhone(e.target.value)} required />
                  {errors.phone && <span className="mt-1.5 text-xs text-error-600 flex items-center gap-1 font-airbnb"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors.phone}</span>}
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className={labelCls}>Special requests (optional)</span>
                  <textarea className={cn(inputCls, "min-h-[100px] resize-y")} rows={3} maxLength={1000} value={requests} onChange={(e) => setRequests(e.target.value)} placeholder="Arrival time, cot needed, celebrating an occasion…" />
                </label>
              </div>
              <div className="mt-6 flex gap-3">
                <Button type="button" variant="stripe-ghost" size="lg" onClick={() => setStep("dates")}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Back
                </Button>
                <Button type="button" variant="stripe-primary" size="lg" className="flex-1" onClick={() => setStep("payment")} disabled={!canProceedFromDetails}>
                  Continue to payment
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Button>
              </div>
            </fieldset>
          )}

          {/* Step 3: Payment */}
          {step === "payment" && (
            <fieldset className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card transition-shadow-card card-airbnb">
              <legend className="px-2 text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2 font-airbnb">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-sm">3</span>
                Payment
              </legend>
              <div className="space-y-3">
                {[
                  { id: "payfast", label: "PayFast", desc: "South African cards, EFT, Instant EFT", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
                  { id: "stripe", label: "Stripe", desc: "International cards (Visa, Mastercard, Amex)", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1.25-17.29l6.13 7.31c-.76.38-1.43.88-2.01 1.48l-4.88-5.81c.67-.68 1.44-1.18 2.27-1.48zM12 4.07c-4.12 0-7.5 3.38-7.5 7.5s3.38 7.5 7.5 7.5 7.5-3.38 7.5-7.5c0-2.16-.95-4.13-2.47-5.48l-5.03 5.99c.53 1.44 1.84 2.53 3.5 2.53 1.67 0 3.02-.95 3.69-2.37l-2.33-2.81c-.58.55-1.3.96-2.15.96-.85 0-1.6-.41-2.04-1.07l-4.22 5.03c1.83 2.28 4.85 3.68 8.07 1.28V13.33c-1.73-.75-3.14-2.06-4.1-3.72l-3.08-3.67z"/></svg> },
                  { id: "ozow", label: "Ozow", desc: "Instant EFT / bank transfer (SA banks)", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg> },
                  { id: "enquiry", label: "Pay later", desc: "Send an enquiry — we'll email you payment details", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
                ].map((opt) => (
                  <label key={opt.id} className="flex items-start gap-4 rounded-xl border border-sand-200 p-4 hover:bg-sand-50 hover:border-brand-200 transition-all cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="mt-1 h-4 w-4 appearance-none rounded-full border-sand-300 text-brand-600 checked:border-brand-600 checked:bg-brand-600 focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2"
                      checked={paymentMethod === opt.id}
                      onChange={() => setPaymentMethod(opt.id as typeof paymentMethod)}
                    />
                    <div className="flex-1 flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">{opt.icon}</div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate font-airbnb">{opt.label}</p>
                        <p className="text-xs text-slate-500 truncate font-airbnb">{opt.desc}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-5 flex items-start gap-3 text-xs text-slate-500 p-4 rounded-xl bg-sand-50 font-airbnb">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500 shrink-0 mt-0.5"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Secure checkout. Your card details are entered on the payment provider&apos;s site — never stored by us.</span>
              </div>
              <div className="mt-6 flex gap-3">
                <Button type="button" variant="stripe-ghost" size="lg" onClick={() => setStep("details")}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Back
                </Button>
                <label className="flex flex-1 items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-2 focus:ring-brand-500/20" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required />
                  <span className="text-sm text-slate-700 font-airbnb">I accept the <a href="/terms" className="underline hover:text-brand-700">terms & conditions</a>, <a href="/cancellation" className="underline hover:text-brand-700">cancellation policy</a> and house rules. Check-in 14:00, check-out 10:00.</span>
                </label>
              </div>
              {errors.acceptTerms && <p className="mt-2 text-xs text-error-600 font-airbnb">{errors.acceptTerms}</p>}
              {errors._ && <div className="mt-4 rounded-xl bg-error-50 p-3.5 text-sm text-error-700 flex items-center gap-2 font-airbnb"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{errors._}</div>}
              <Button type="submit" disabled={!canSubmit} size="xl" className="w-full py-5 text-base font-stripe" variant="stripe-primary">
                {submitting
                  ? "Processing…"
                  : quote && quote.depositPercent > 0 && quote.depositPercent < 100
                    ? `Pay ${quote.depositPercent}% deposit — ${formatZAR(quote.depositCents)}`
                    : "Confirm booking"}
              </Button>
              {quote && quote.depositPercent > 0 && quote.depositPercent < 100 && (
                <p className="text-center text-xs text-slate-500 font-airbnb">
                  You pay {formatZAR(quote.depositCents)} now. The balance of {formatZAR(quote.balanceCents)} is paid on arrival.
                </p>
              )}
            </fieldset>
          )}

          {/* Mobile step navigation */}
          <div className="lg:hidden flex gap-3">
            <Button type="button" variant="stripe-ghost" size="md" className="flex-1" onClick={() => setStep("dates")}>1. Dates</Button>
            <Button type="button" variant="stripe-ghost" size="md" className="flex-1" onClick={() => setStep("details")}>2. Details</Button>
            <Button type="button" variant="stripe-ghost" size="md" className="flex-1" onClick={() => setStep("payment")}>3. Payment</Button>
          </div>
        </div>

        {/* Sticky pricing sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {quote ? (
            <PricingBreakdown quote={quote} />
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-sand-200 p-8 text-center card-airbnb">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-sand-300 mb-4"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <p className="text-slate-500 font-airbnb">{loadingQuote ? "Calculating your best price…" : "Select your dates to see a live price. Minimum 2 nights (3 in peak season)."}</p>
            </div>
          )}
        </aside>
      </form>
    </Container>
  );
}