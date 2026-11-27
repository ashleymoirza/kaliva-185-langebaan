import type { Quote } from "@/lib/pricing";
import { formatDate, formatZAR } from "@/lib/utils";

export default function PricingBreakdown({ quote }: { quote: Quote }) {
  const showDeposit = quote.depositPercent > 0 && quote.depositPercent < 100;

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card hover:shadow-card-hover transition-shadow-card">
      <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Your price
      </h3>

      {!quote.meetsMinimum && quote.messages.length > 0 && (
        <div className="mt-4 rounded-xl bg-warning-50 p-3.5 text-sm text-warning-700 flex items-start gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {quote.messages[0]}
        </div>
      )}

      <ul className="mt-5 space-y-3 max-h-60 overflow-y-auto pr-1" role="list" aria-label="Nightly rates">
        {quote.nightly.map((n) => (
          <li key={n.date} className="flex items-start justify-between gap-3 text-sm p-3 rounded-xl bg-sand-50 hover:bg-sand-100 transition-colors">
            <div className="flex flex-col">
              <span className="font-medium text-slate-900">{formatDate(n.date)}</span>
              <span className="text-xs text-slate-500">
                {n.seasonLabel}{n.weekendSurchargeCents > 0 ? " · Weekend" : ""}
              </span>
            </div>
            <span className="font-semibold text-slate-900 shrink-0">{formatZAR(n.rateCents)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 space-y-3 border-t border-sand-200 pt-4 text-sm">
        <div className="flex justify-between text-slate-600">
          <dt>Accommodation ({quote.nights} night{quote.nights === 1 ? "" : "s"})</dt>
          <dd className="font-medium text-slate-900">{formatZAR(quote.accommodationCents)}</dd>
        </div>
        {quote.cleaningFeeCents > 0 && (
          <div className="flex justify-between text-slate-600">
            <dt>Cleaning & linen</dt>
            <dd className="font-medium text-slate-900">{formatZAR(quote.cleaningFeeCents)}</dd>
          </div>
        )}
        {quote.serviceFeeCents > 0 && (
          <div className="flex justify-between text-slate-600">
            <dt>Service fee</dt>
            <dd className="font-medium text-slate-900">{formatZAR(quote.serviceFeeCents)}</dd>
          </div>
        )}
        {quote.lastMinuteDiscountCents > 0 && (
          <div className="flex justify-between text-success-700">
            <dt>Last-minute discount</dt>
            <dd className="font-medium">-{formatZAR(quote.lastMinuteDiscountCents)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-sand-200 pt-3 text-base font-bold text-slate-900">
          <dt>Total for the stay</dt>
          <dd>{formatZAR(quote.totalCents)}</dd>
        </div>
      </dl>

      {showDeposit && (
        <div className="mt-5 rounded-xl bg-brand-50 p-4 border border-brand-100">
          <div className="flex justify-between font-semibold text-brand-900">
            <span>Pay now ({quote.depositPercent}% deposit)</span>
            <span>{formatZAR(quote.depositCents)}</span>
          </div>
          <div className="mt-2 flex justify-between text-brand-800 text-sm">
            <span>Balance on arrival</span>
            <span>{formatZAR(quote.balanceCents)}</span>
          </div>
        </div>
      )}

      {quote.messages.slice(1).map((m) => (
        <p key={m} className="mt-3 text-xs text-success-700 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
          {m}
        </p>
      ))}

      <p className="mt-5 text-xs text-slate-500 text-center">
        Prices in South African Rand (ZAR). You pay securely on PayFast, Stripe or Ozow — we never see or store your card details.
      </p>
    </div>
  );
}