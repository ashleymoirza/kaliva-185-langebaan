import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { DEFAULT_PRICING, sanitiseConfig, type PricingConfig } from "@/lib/pricing";
import { eachNight, todayISO } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type BookingStatus = "pending" | "confirmed" | "cancelled";
export type PaymentMethod = "payfast" | "stripe" | "ozow" | "enquiry";

export interface Booking {
  id: string;
  userId?: string;
  unitSlug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  requests: string;
  referral: string;
  totalCents: number;
  depositCents?: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentRef: string | null;
  createdAt: string;
}

export interface EnquiryMessage {
  id: string;
  bookingId: string;
  author: "admin" | "guest";
  body: string;
  createdAt: string;
}

export interface BlockedDate {
  unitSlug: string;
  date: string;
  reason: string;
}

// ── Fallback store: a JSON file so settings survive restarts when there is no DB. ──
const FILE = path.join(process.cwd(), ".data", "store.json");
const memBookings: Booking[] = [];
const memBlocked: BlockedDate[] = [];
const memMessages: EnquiryMessage[] = [];
let memPricing: PricingConfig = DEFAULT_PRICING;
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const data = JSON.parse(await fs.readFile(FILE, "utf8"));
    if (Array.isArray(data.bookings)) memBookings.push(...data.bookings);
    if (Array.isArray(data.blocked)) memBlocked.push(...data.blocked);
    if (Array.isArray(data.messages)) memMessages.push(...data.messages);
    if (data.pricing) memPricing = sanitiseConfig(data.pricing);
  } catch {
    /* first run — nothing to load */
  }
}

async function saveState(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify({ bookings: memBookings, blocked: memBlocked, messages: memMessages, pricing: memPricing }, null, 2), "utf8");
  } catch (err) {
    console.warn("[store] could not persist fallback state.", err);
  }
}

export async function createBooking(input: Omit<Booking, "id" | "createdAt" | "status"> & {
  status?: BookingStatus;
}): Promise<Booking> {
  const booking: Booking = {
    id: randomUUID(),
    status: input.status ?? "pending",
    createdAt: new Date().toISOString(),
    ...input,
  };
  const db = await getDb();
  if (db) {
    try {
      await db.booking.create({ data: booking });
      return booking;
    } catch (err) {
      console.warn("[bookings] DB write failed, using memory.", err);
    }
  }
  memBookings.unshift(booking);
  await saveState();
  return booking;
}

export async function listBookings(): Promise<Booking[]> {
  await ensureLoaded();
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.booking.findMany({ orderBy: { createdAt: "desc" } });
      return rows as Booking[];
    } catch (err) {
      console.warn("[bookings] DB read failed, using memory.", err);
    }
  }
  return [...memBookings];
}

export async function getBooking(id: string): Promise<Booking | null> {
  const db = await getDb();
  if (db) {
    try {
      const row = await db.booking.findUnique({ where: { id } });
      if (row) return row as Booking;
    } catch (err) {
      console.warn("[bookings] DB read failed, using memory.", err);
    }
  }
  return memBookings.find((b) => b.id === id) ?? null;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<boolean> {
  const db = await getDb();
  if (db) {
    try {
      await db.booking.update({ where: { id }, data: { status } });
      return true;
    } catch (err) {
      console.warn("[bookings] DB update failed, using memory.", err);
    }
  }
  const b = memBookings.find((x) => x.id === id);
  if (!b) return false;
  b.status = status;
  await saveState();
  return true;
}

export async function listBlocked(): Promise<BlockedDate[]> {
  await ensureLoaded();
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.blockedDate.findMany();
      return rows as BlockedDate[];
    } catch (err) {
      console.warn("[blocked] DB read failed, using memory.", err);
    }
  }
  return [...memBlocked];
}

export async function addBlockedRange(
  unitSlug: string,
  from: string,
  to: string,
  reason: string,
): Promise<number> {
  // Include the end date, so the range is inclusive.
  const dates = eachNight(from, addOne(to));
  const rows: BlockedDate[] = dates.map((date) => ({ unitSlug, date, reason }));
  const db = await getDb();
  if (db) {
    try {
      await db.blockedDate.createMany({ data: rows, skipDuplicates: true });
      return rows.length;
    } catch (err) {
      console.warn("[blocked] DB write failed, using memory.", err);
    }
  }
  for (const r of rows) {
    if (!memBlocked.some((b) => b.unitSlug === r.unitSlug && b.date === r.date)) memBlocked.push(r);
  }
  await saveState();
  return rows.length;
}

function addOne(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Dates a unit cannot be booked: paid/held bookings + manual blocks. */
export async function unavailableDates(unitSlug: string): Promise<string[]> {
  const set = new Set<string>();
  const now = todayISO();
  (await listBlocked())
    .filter((b) => b.unitSlug === unitSlug)
    .forEach((b) => set.add(b.date));
  (await listBookings())
    .filter((b) => b.unitSlug === unitSlug && b.status !== "cancelled" && b.checkOut >= now)
    .forEach((b) => eachNight(b.checkIn, b.checkOut).forEach((d) => set.add(d)));
  return [...set].sort();
}

export async function isAvailable(unitSlug: string, checkIn: string, checkOut: string): Promise<boolean> {
  const blocked = new Set(await unavailableDates(unitSlug));
  return !eachNight(checkIn, checkOut).some((d) => blocked.has(d));
}

export async function getPricingConfig(): Promise<PricingConfig> {
  await ensureLoaded();
  const db = await getDb();
  if (db) {
    try {
      const row = await db.pricingConfig.findUnique({ where: { id: "default" } });
      if (row?.data) return sanitiseConfig(row.data as Partial<PricingConfig>);
    } catch (err) {
      console.warn("[pricing] DB read failed, using default.", err);
    }
  }
  return memPricing;
}

export async function savePricingConfig(patch: Partial<PricingConfig>): Promise<PricingConfig> {
  const current = await getPricingConfig();
  const merged = sanitiseConfig({ ...current, ...patch });
  const db = await getDb();
  if (db) {
    try {
      await db.pricingConfig.upsert({
        where: { id: "default" },
        update: { data: merged as any },
        create: { id: "default", data: merged as any },
      });
      return merged;
    } catch (err) {
      console.warn("[pricing] DB write failed, using memory.", err);
    }
  }
  memPricing = merged;
  await saveState();
  return merged;
}

export interface RevenueBucket {
  label: string;
  bookings: number;
  grossCents: number;
}

export function summariseRevenue(bookings: Booking[]): {
  daily: RevenueBucket[];
  totalCents: number;
  confirmedCents: number;
  byStatus: Record<BookingStatus, number>;
} {
  const paid = bookings.filter((b) => b.status !== "cancelled");
  const byDay = new Map<string, RevenueBucket>();
  for (const b of paid) {
    const label = b.createdAt.slice(0, 10);
    const cur = byDay.get(label) ?? { label, bookings: 0, grossCents: 0 };
    cur.bookings += 1;
    cur.grossCents += b.totalCents;
    byDay.set(label, cur);
  }
  const byStatus: Record<BookingStatus, number> = { pending: 0, confirmed: 0, cancelled: 0 };
  for (const b of bookings) byStatus[b.status] += 1;
  return {
    daily: [...byDay.values()].sort((a, b) => (a.label < b.label ? 1 : -1)).slice(0, 30),
    totalCents: paid.reduce((s, b) => s + b.totalCents, 0),
    confirmedCents: bookings.filter((b) => b.status === "confirmed").reduce((s, b) => s + b.totalCents, 0),
    byStatus,
  };
}

export async function removeBlockedRange(unitSlug: string, from: string, to: string): Promise<number> {
  const dates = eachNight(from, addOne(to));
  const db = await getDb();
  if (db) {
    try {
      const res = await db.blockedDate.deleteMany({ where: { unitSlug, date: { in: dates } } });
      return res?.count ?? 0;
    } catch (err) {
      console.warn("[blocked] DB delete failed, using memory.", err);
    }
  }
  const set = new Set(dates);
  let removed = 0;
  for (let i = memBlocked.length - 1; i >= 0; i--) {
    if (memBlocked[i].unitSlug === unitSlug && set.has(memBlocked[i].date)) {
      memBlocked.splice(i, 1);
      removed++;
    }
  }
  await saveState();
  return removed;
}

// ── Enquiry / ticket messages ─────────────────────────────────────────────
export async function listMessages(bookingId?: string): Promise<EnquiryMessage[]> {
  await ensureLoaded();
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.enquiryMessage.findMany({
        where: bookingId ? { bookingId } : undefined,
        orderBy: { createdAt: "asc" },
      });
      return rows as EnquiryMessage[];
    } catch (err) {
      console.warn("[messages] DB read failed, using fallback.", err);
    }
  }
  return bookingId ? memMessages.filter((m) => m.bookingId === bookingId) : [...memMessages];
}

export async function addMessage(
  bookingId: string,
  author: "admin" | "guest",
  body: string,
): Promise<EnquiryMessage> {
  const msg: EnquiryMessage = {
    id: randomUUID(),
    bookingId,
    author,
    body: body.slice(0, 4000),
    createdAt: new Date().toISOString(),
  };
  const db = await getDb();
  if (db) {
    try {
      await db.enquiryMessage.create({ data: msg });
      return msg;
    } catch (err) {
      console.warn("[messages] DB write failed, using fallback.", err);
    }
  }
  memMessages.push(msg);
  await saveState();
  return msg;
}
