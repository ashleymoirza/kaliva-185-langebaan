import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
// Deliberately excludes SVG (scriptable) and any non-image type.
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return Response.json({ ok: false }, { status: 401 });

  const rl = rateLimit(`upload:${clientIp(req)}`, 30, 60_000);
  if (!rl.success) return tooMany(rl.reset);

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return Response.json({ ok: false, message: "Expected a file upload." }, { status: 415 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ ok: false, message: "Could not read the upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, message: "No file received." }, { status: 400 });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return Response.json(
      { ok: false, message: "Only JPG, PNG, WebP, GIF or AVIF images are allowed." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ ok: false, message: "Image must be smaller than 5 MB." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  // Cheap magic-number sanity check for the common types.
  const isPng = bytes.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const isGif = bytes.slice(0, 3).toString("ascii") === "GIF";
  const isWebp = bytes.slice(0, 4).toString("ascii") === "RIFF" && bytes.slice(8, 12).toString("ascii") === "WEBP";
  if (!(isPng || isJpg || isGif || isWebp || ext === "avif")) {
    return Response.json({ ok: false, message: "That file isn't a valid image." }, { status: 415 });
  }

  const name = `${randomUUID()}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), bytes);

  return Response.json({ ok: true, url: `/api/media/${name}`, bytes: file.size });
}
