import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Lead {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  source?: string; // e.g., "share_link", "meta_ad", "direct"
  referralId?: string;
  status: "new" | "contacted" | "converted" | "cancelled";
  visitedAt: string;
  bookedAt?: string;
  bookingId?: string;
  createdAt: string;
  updatedAt: string;
}

// Fallback store: a JSON file so leads survive restarts when there is no DB.
const FILE = path.join(process.cwd(), ".data", "store.json");
const memLeads: Lead[] = [];
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const data = JSON.parse(await fs.readFile(FILE, "utf8"));
    if (Array.isArray(data.leads)) memLeads.push(...data.leads);
  } catch {
    /* first run — nothing to load */
  }
}

async function saveState(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify({ leads: memLeads }, null, 2), "utf8");
  } catch (err) {
    console.warn("[leads-store] could not persist fallback state.", err);
  }
}

export async function listLeads(): Promise<Lead[]> {
  await ensureLoaded();
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.lead.findMany({ orderBy: { visitedAt: "desc" } });
      return rows as Lead[];
    } catch (err) {
      console.warn("[leads-store] DB read failed, using memory.", err);
    }
  }
  return [...memLeads];
}

export async function createLead(input: Omit<Lead, "id" | "createdAt" | "updatedAt">): Promise<Lead> {
  const lead: Lead = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...input,
    status: input.status ?? "new",
  };
  const db = await getDb();
  if (db) {
    try {
      const created = await db.lead.create({ data: lead });
      await saveState();
      return created;
    } catch (err) {
      console.warn("[leads-store] DB write failed, using memory.", err);
    }
  }
  memLeads.unshift(lead);
  await saveState();
  return lead;
}

export async function updateLeadStatus(id: string, status: Lead["status"]): Promise<boolean> {
  const db = await getDb();
  if (db) {
    try {
      await db.lead.update({ where: { id }, data: { status } });
      return true;
    } catch (err) {
      console.warn("[leads-store] DB update failed, using memory.", err);
    }
  }
  const b = memLeads.find((x) => x.id === id);
  if (!b) return false;
  b.status = status;
  b.updatedAt = new Date().toISOString();
  await saveState();
  return true;
}