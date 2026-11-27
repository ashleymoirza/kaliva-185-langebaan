import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  // Strict allow-list => blocks path traversal (../) entirely.
  if (!/^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp|gif|avif)$/i.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  const full = path.join(UPLOAD_DIR, file);
  if (!full.startsWith(UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });

  try {
    const data = await fs.readFile(full);
    const ext = file.split(".").pop()!.toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
