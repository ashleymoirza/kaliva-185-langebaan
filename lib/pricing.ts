import { eachNight, isWeekendNight, nightsBetween, todayISO } from "@/lib/utils";

export interface PricingRule {
  id: string;
  label: string;
  /** Inclusive ISO date ranges, e.g. Easter or a local event. */
  dateRanges?: { from: string; to: string }[];
  multiplier: number;
  priority?: number;
}

/** A room's nightly price for each season, set by the admin. */
export interface RoomPrice {
  lowCents: number;
  highCents: number;
}

export interface PricingConfig {
  /** Percentage taken as a deposit at checkout (e.g. 50). */
  depositPercent: number;
  /** Months (1-12) counted as high season, e.g. [12, 1]. */
  highSeasonMonths: number[];
  /** Extra charge for Fri/Sat nights, e.g. 0.15 = +15%. */
  weekendSurcharge: number;
  minNightsLow: number;
  minNightsPeak: number;
  lastMinuteDays: number;
  lastMinuteDiscount: number;
  cleaningFeeCents: number;
  serviceFeeRate: number;
  /** Fallback high-season multiplier for rooms without an explicit high price. */
  peakMultiplier: number;
  /** Special events (date ranges) that count as high season. */
  rules: PricingRule[];
  /** Per-room low/high nightly prices, keyed by room slug. */
  roomPrices: Record<string, RoomPrice>;
}

export const DEFAULT_PRICING: PricingConfig = {
  depositPercent: 50,
  highSeasonMonths: [12, 1],
  weekendSurcharge: 0.15,
  minNightsLow: 2,
  minNightsPeak: 3,
  lastMinuteDays: 7,
  lastMinuteDiscount: 0.1,
  cleaningFeeCents: 35000,
  serviceFeeRate: 0,
  peakMultiplier: 1.8,
  rules: [
    { id: "easter", label: "Easter weekend", dateRanges: [{ from: "2026-04-03", to: "2026-04-06" }], multiplier: 1.8, priority: 30 },
    { id: "angling-classic", label: "Langebaan Angling Classic", dateRanges: [{ from: "2026-10-09", to: "2026-10-11" }], multiplier: 1.6, priority: 40 },
  ],
  roomPrices: {},
};

/** True if a date falls in high season (month rule or an event range). */
export function isHighSeasonDate(iso: string, config: PricingConfig): boolean {
  const m = Number(iso.split("-")[1]);
  if (config.highSeasonMonths?.includes(m)) return true;
  return (config.rules ?? []).some((r) => r.dateRanges?.some((rng) => iso >= rng.from && iso <= rng.to));
}

function labelForDate(iso: string, config: PricingConfig): string {
  const event = (config.rules ?? []).find((r) => r.dateRanges?.some((rng) => iso >= rng.from && iso <= rng.to));
  if (event) return event.label;
  return isHighSeasonDate(iso, config) ? "High season" : "Low season";
}

/** Work out a room's low/high price — explicit admin prices if set, else base × multiplier. */
export function resolveRoomPrices(
  unitSlug: string,
  basePriceCents: number,
  config: PricingConfig,
): RoomPrice {
  const rp = config.roomPrices?.[unitSlug];
  if (rp && rp.lowCents > 0) {
    return { lowCents: rp.lowCents, highCents: rp.highCents > 0 ? rp.highCents : rp.lowCents };
  }
  return {
    lowCents: basePriceCents,
    highCents: Math.round(basePriceCents * (config.peakMultiplier || 1.8)),
  };
}

export interface QuoteNight {
  date: string;
  isHigh: boolean;
  seasonLabel: string;
  rateCents: number;
  weekendSurchargeCents: number;
}

export interface Quote {
  nights: number;
  minNights: number;
  meetsMinimum: boolean;
  nightly: QuoteNight[];
  accommodationCents: number;
  cleaningFeeCents: number;
  serviceFeeCents: number;
  lastMinuteDiscountCents: number;
  totalCents: number;
  depositPercent: number;
  depositCents: number;
  balanceCents: number;
  isPeak: boolean;
  lastMinute: boolean;
  messages: string[];
}

/** All amounts in ZAR cents. Pure and deterministic. */
export function computeQuote(
  args: { lowCents: number; highCents: number; checkIn: string; checkOut: string; now?: string },
  config: PricingConfig = DEFAULT_PRICING,
): Quote {
  const { lowCents, highCents, checkIn, checkOut } = args;
  const today = args.now ?? todayISO();
  const dates = eachNight(checkIn, checkOut);
  const nights = nightsBetween(checkIn, checkOut);

  const highNights = dates.filter((d) => isHighSeasonDate(d, config)).length;
  const isPeak = highNights > 0;
  const minNights = isPeak ? config.minNightsPeak : config.minNightsLow;

  const nightly: QuoteNight[] = dates.map((date) => {
    const high = isHighSeasonDate(date, config);
    const base = high ? highCents : lowCents;
    const weekend = isWeekendNight(date) ? Math.round(base * config.weekendSurcharge) : 0;
    return {
      date,
      isHigh: high,
      seasonLabel: labelForDate(date, config),
      rateCents: base + weekend,
      weekendSurchargeCents: weekend,
    };
  });

  const accommodationCents = nightly.reduce((s, n) => s + n.rateCents, 0);
  const serviceFeeCents = Math.round(accommodationCents * config.serviceFeeRate);

  const daysUntil = Math.round((Date.parse(`${checkIn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  const lastMinute = config.lastMinuteDays > 0 && daysUntil >= 0 && daysUntil <= config.lastMinuteDays;
  const lastMinuteDiscountCents = lastMinute ? Math.round(accommodationCents * config.lastMinuteDiscount) : 0;

  const totalCents = accommodationCents + config.cleaningFeeCents + serviceFeeCents - lastMinuteDiscountCents;
  const depositPercent = Math.min(100, Math.max(0, config.depositPercent));
  const depositCents = Math.round(totalCents * (depositPercent / 100));

  const messages: string[] = [];
  if (dates.length === 0) messages.push("Choose a check-out date after your check-in date.");
  else if (nights < minNights)
    messages.push(`A minimum stay of ${minNights} nights applies ${isPeak ? "in high season" : "in this season"}.`);
  if (lastMinute) messages.push(`Last-minute discount of ${Math.round(config.lastMinuteDiscount * 100)}% applied.`);

  return {
    nights, minNights,
    meetsMinimum: dates.length > 0 && nights >= minNights,
    nightly, accommodationCents,
    cleaningFeeCents: config.cleaningFeeCents,
    serviceFeeCents, lastMinuteDiscountCents,
    totalCents, depositPercent, depositCents,
    balanceCents: totalCents - depositCents,
    isPeak, lastMinute, messages,
  };
}

/** Defensive clamp of an admin-supplied config (DB/JSON values are untrusted). */
export function sanitiseConfig(input: Partial<PricingConfig> | null | undefined): PricingConfig {
  if (!input || typeof input !== "object") return DEFAULT_PRICING;
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
    return Math.min(max, Math.max(min, n));
  };
  const roomPrices: Record<string, RoomPrice> = {};
  if (input.roomPrices && typeof input.roomPrices === "object") {
    for (const [slug, val] of Object.entries(input.roomPrices)) {
      if (!/^[a-z0-9-]{1,60}$/.test(slug)) continue;
      const v = val as Partial<RoomPrice>;
      const low = num(v?.lowCents, 0, 0, 100_000_00);
      if (low <= 0) continue;
      const high = num(v?.highCents, low, 0, 100_000_00) || low;
      roomPrices[slug] = { lowCents: Math.round(low), highCents: Math.round(high) };
    }
  }
  const months = Array.isArray(input.highSeasonMonths)
    ? input.highSeasonMonths.filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
    : DEFAULT_PRICING.highSeasonMonths;

  return {
    depositPercent: Math.round(num(input.depositPercent, DEFAULT_PRICING.depositPercent, 0, 100)),
    highSeasonMonths: months.length ? months : DEFAULT_PRICING.highSeasonMonths,
    weekendSurcharge: num(input.weekendSurcharge, DEFAULT_PRICING.weekendSurcharge, 0, 2),
    minNightsLow: Math.round(num(input.minNightsLow, DEFAULT_PRICING.minNightsLow, 1, 30)),
    minNightsPeak: Math.round(num(input.minNightsPeak, DEFAULT_PRICING.minNightsPeak, 1, 30)),
    lastMinuteDays: Math.round(num(input.lastMinuteDays, DEFAULT_PRICING.lastMinuteDays, 0, 90)),
    lastMinuteDiscount: num(input.lastMinuteDiscount, DEFAULT_PRICING.lastMinuteDiscount, 0, 0.9),
    cleaningFeeCents: Math.round(num(input.cleaningFeeCents, DEFAULT_PRICING.cleaningFeeCents, 0, 10_000_00)),
    serviceFeeRate: num(input.serviceFeeRate, DEFAULT_PRICING.serviceFeeRate, 0, 0.5),
    peakMultiplier: num(input.peakMultiplier, DEFAULT_PRICING.peakMultiplier, 0.5, 5),
    rules: Array.isArray(input.rules) && input.rules.length ? input.rules : DEFAULT_PRICING.rules,
    roomPrices,
  };
}
