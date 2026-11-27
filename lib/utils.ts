/** Tiny class-name combiner (avoids a clsx dependency). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const zar = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

/** Format an integer number of cents (ZAR) as a currency string. */
export function formatZAR(cents: number): string {
  const rounded = Math.round(cents);
  return zar.format(rounded / 100);
}

/** Whole nights between two ISO date strings (YYYY-MM-DD). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.parse(`${checkIn}T00:00:00Z`);
  const b = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Iterate ISO dates from checkIn (inclusive) to checkOut (exclusive). */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end)) return out;
  while (cur.getTime() < end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** Is an ISO date a Friday or Saturday (weekend surcharge applies)? */
export function isWeekendNight(iso: string): boolean {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return day === 5 || day === 6;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Human-friendly date, e.g. "12 Dec 2026". */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Only allow same-origin, absolute-path redirect targets (open-redirect guard). */
export function safeNextPath(next: string | null | undefined, fallback = "/admin"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
