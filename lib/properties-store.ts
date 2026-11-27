import { promises as fs } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { PROPERTIES, type Property } from "@/lib/properties";

/* eslint-disable @typescript-eslint/no-explicit-any */

const FILE = path.join(process.cwd(), ".data", "properties.json");
let mem: Property[] | null = null;

async function readFile(): Promise<Property[] | null> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Property[];
  } catch {
    return null;
  }
}

async function writeFile(list: Property[]): Promise<void> {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.warn("[properties] file store unwritable.", err);
  }
}

export async function listProperties(): Promise<Property[]> {
  const db = await getDb();
  if (db) {
    try {
      const rows = await db.property.findMany({ orderBy: [{ featured: "desc" }, { name: "asc" }] });
      if (rows.length) return rows as Property[];
    } catch (err) {
      console.warn("[properties] DB read failed, using default.", err);
    }
  }
  return (await readFile()) ?? mem ?? PROPERTIES;
}

export async function getPropertyBySlug(slug: string): Promise<Property | undefined> {
  return (await listProperties()).find((p) => p.slug === slug);
}

export async function upsertProperty(input: Property): Promise<Property> {
  const list = [...(await listProperties())];
  const i = list.findIndex((p) => p.slug === input.slug);
  if (i >= 0) list[i] = input;
  else list.push(input);

  const db = await getDb();
  if (db) {
    try {
      await db.property.upsert({
        where: { slug: input.slug },
        update: input as any,
        create: input as any,
      });
      return input;
    } catch (err) {
      console.warn("[properties] DB write failed, using file/memory.", err);
    }
  }
  mem = list;
  await writeFile(list);
  return input;
}

export async function deleteProperty(slug: string): Promise<boolean> {
  const list = (await listProperties()).filter((p) => p.slug !== slug);
  const db = await getDb();
  if (db) {
    try {
      await db.property.delete({ where: { slug } });
      return true;
    } catch (err) {
      console.warn("[properties] DB delete failed, using file/memory.", err);
    }
  }
  mem = list;
  await writeFile(list);
  return true;
}

/** Only these properties are shown publicly. */
export async function listActiveProperties(): Promise<Property[]> {
  return (await listProperties()).filter((p) => p.active !== false);
}
