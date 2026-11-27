import Link from "next/link";
import { NAV_LINKS, SITE, whatsappLink } from "@/lib/site";
import Container from "@/components/ui/Container";

export default function Footer() {
  return (
    <footer className="border-t border-brand-100 bg-sand-50 mt-20">
      <Container size="xl" className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2.5 mb-6" aria-label={`${SITE.name} - Home`}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 font-bold text-white">
              K
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-slate-900">{SITE.shortName}</span>
              <span className="block text-[10px] text-slate-500 font-medium">{SITE.resort}</span>
            </span>
          </Link>
          <p className="max-w-xs text-sm text-slate-600 leading-relaxed">
            {SITE.tagline}. Privately owned, 6-sleeper beachfront apartment with 3 bedrooms and private braai.
            Direct booking for the best price.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={whatsappLink("Hi, I'd like to enquire about a stay at Kaliva 185.")} className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1ebe5b] transition-colors" target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.52 3.48A11.914 11.914 0 0012 0C5.373 0 0 5.373 0 12c0 1.997.53 3.886 1.488 5.557L0 24l6.133-1.825A11.957 11.957 0 0012 24c6.627 0 12-5.373 12-12 0-1.834-.364-3.57-1.011-5.155L20.52 3.48zM8 13c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2H10c-1.1 0-2 .9-2 2v4zm5-8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/></svg>
              WhatsApp us
            </a>
            <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Email us
            </a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Explore</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-brand-700 transition-colors flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Contact</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 shrink-0 mt-0.5" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <address className="not-italic">{SITE.address}</address>
            </li>
            <li>
              <a href={`tel:${SITE.phoneDisplay.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-brand-700 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {SITE.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`} className="flex items-center gap-2 hover:text-brand-700 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                {SITE.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Good to know</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              Check-in 14:00 · Check-out 10:00
            </li>
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500 shrink-0" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Secure payments via PayFast, Stripe & Ozow
            </li>
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500 shrink-0" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Best-price guarantee
            </li>
            <li className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500 shrink-0" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
              Direct booking - no hidden fees
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-brand-100 bg-white">
        <Container size="xl" className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p className="text-xs text-slate-500">Club Mykonos · Langebaan · West Coast, South Africa</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-brand-700 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-brand-700 transition-colors">Terms</Link>
            <Link href="/cancellation" className="hover:text-brand-700 transition-colors">Cancellation Policy</Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}