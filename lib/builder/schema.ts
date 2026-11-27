import { z } from "zod";
import { BLOCK_ORDER, type Block, type SiteLayout } from "./types";

const MAX_STR = 5000;

export const layoutSchema = z.object({
  version: z.coerce.number().int().min(1).max(1000),
  page: z.string().trim().min(1).max(50),
  theme: z.object({
    primary: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #2572eb"),
    radius: z.coerce.number().int().min(0).max(48),
  }),
  blocks: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        type: z.string().refine((t) => (BLOCK_ORDER as string[]).includes(t), "Unknown block type"),
        visible: z.boolean(),
        props: z.record(z.string(), z.unknown()),
      }),
    )
    .max(60),
});

export type LayoutInput = z.infer<typeof layoutSchema>;

const SAFE_HREF = /^(\/|#|https:\/\/|mailto:|tel:)/i;

/** Recursively trim strings and neutralise dangerous values by key name. */
function walk(value: unknown, key: string, depth: number): unknown {
  if (depth > 6) return undefined;
  if (typeof value === "string") {
    const s = value.slice(0, MAX_STR).trim();
    const k = key.toLowerCase();
    if (k.includes("href") || k === "link" || k === "url") {
      return SAFE_HREF.test(s) ? s : "#";
    }
    if (k.includes("image") || k.includes("img") || k.includes("src")) {
      return /^\/[A-Za-z0-9._\-\/]*$|^https:\/\//.test(s) ? s : "";
    }
    return s;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) {
    return value.slice(0, 60).map((v) => walk(v, key, depth + 1)).filter((v) => v !== undefined);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Block prototype-pollution style keys.
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      const walked = walk(v, k, depth + 1);
      if (walked !== undefined) out[k] = walked;
    }
    return out;
  }
  return undefined;
}

/** Validate + clean a layout coming from the admin editor before persisting. */
export function cleanLayout(input: unknown): SiteLayout {
  const parsed = layoutSchema.parse(input);
  const blocks: Block[] = parsed.blocks.map((b) => ({
    id: b.id,
    type: b.type as Block["type"],
    visible: b.visible,
    props: (walk(b.props, "", 0) as Record<string, unknown>) ?? {},
  }));
  return {
    version: parsed.version,
    page: parsed.page,
    theme: parsed.theme,
    blocks,
  };
}
