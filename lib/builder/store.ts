import { promises as fs } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { cleanLayout } from "./schema";
import { defaultLayout, type SiteLayout } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = { draft: SiteLayout; published: SiteLayout | null };

// Fallback persistence for demo/dev when no database is configured.
const FILE = path.join(process.cwd(), ".data", "site.json");
const mem: Record<string, Row> = {};

async function readFile(): Promise<Record<string, Row>> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Record<string, Row>;
  } catch {
    return {};
  }
}

async function writeFile(data: Record<string, Row>): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn("[builder] file store unwritable, keeping in memory.", err);
  }
}

export async function getDraft(page: string): Promise<SiteLayout> {
  const db = await getDb();
  if (db) {
    try {
      const row = await db.sitePage.findUnique({ where: { slug: page } });
      if (row?.draft) return cleanLayout(row.draft);
    } catch (err) {
      console.warn("[builder] DB read failed.", err);
    }
  }
  const file = await readFile();
  const row = file[page] ?? mem[page];
  return row?.draft ?? defaultLayout(page);
}

export async function saveDraft(page: string, layout: SiteLayout): Promise<SiteLayout> {
  const clean = cleanLayout({ ...layout, page });
  const db = await getDb();
  if (db) {
    try {
      const existing = await db.sitePage.findUnique({ where: { slug: page } });
      await db.sitePage.upsert({
        where: { slug: page },
        update: { draft: clean as any },
        create: { slug: page, draft: clean as any, published: existing?.published ?? null },
      });
      return clean;
    } catch (err) {
      console.warn("[builder] DB write failed, using file/memory.", err);
    }
  }
  const file = await readFile();
  const prev = file[page] ?? mem[page];
  const next: Row = { draft: clean, published: prev?.published ?? null };
  mem[page] = next;
  file[page] = next;
  await writeFile(file);
  return clean;
}

export async function publish(page: string): Promise<SiteLayout> {
  const draft = await getDraft(page);
  const db = await getDb();
  if (db) {
    try {
      await db.sitePage.upsert({
        where: { slug: page },
        update: { published: draft as any },
        create: { slug: page, draft: draft as any, published: draft as any },
      });
      return draft;
    } catch (err) {
      console.warn("[builder] DB publish failed, using file/memory.", err);
    }
  }
  const file = await readFile();
  const next: Row = { draft, published: draft };
  mem[page] = next;
  file[page] = next;
  await writeFile(file);
  return draft;
}

/** Layout the public site should render: published if present, else the draft, else default. */
export async function getLiveLayout(page: string): Promise<{ layout: SiteLayout; published: boolean }> {
  const db = await getDb();
  if (db) {
    try {
      const row = await db.sitePage.findUnique({ where: { slug: page } });
      if (row?.published) return { layout: cleanLayout(row.published), published: true };
      return { layout: defaultLayout(page), published: false };
    } catch (err) {
      console.warn("[builder] DB read failed.", err);
    }
  }
  const file = await readFile();
  const row = file[page] ?? mem[page];
  if (row?.published) return { layout: row.published, published: true };
  return { layout: defaultLayout(page), published: false };
}

export async function resetDraft(page: string): Promise<SiteLayout> {
  return saveDraft(page, defaultLayout(page));
}
