"use client";

import { useRef, useState } from "react";

/** Uploads a single image to /api/admin/upload and hands back its URL. */
export function UploadButton({
  onUploaded,
  label = "Upload image",
}: {
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) onUploaded(data.url);
      else setErr(data.message ?? "Upload failed.");
    } catch {
      setErr("Upload failed.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 ring-1 ring-brand-200 disabled:opacity-50"
      >
        {busy ? "Uploading…" : label}
      </button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={pick} />
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  );
}

/** A gallery editor: thumbnails with remove + upload. */
export function ImageGalleryEditor({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((src, i) => (
          <div key={src + i} className="relative h-20 w-28 overflow-hidden rounded-lg ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, x) => x !== i))}
              className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs text-red-600 shadow"
              title="Remove"
            >
              ✕
            </button>
            {i > 0 && (
              <button
                type="button"
                onClick={() => {
                  const c = [...images];
                  [c[i - 1], c[i]] = [c[i], c[i - 1]];
                  onChange(c);
                }}
                className="absolute left-1 top-1 rounded-full bg-white/90 px-1.5 text-xs text-slate-600 shadow"
                title="Move earlier"
              >
                ←
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2">
        <UploadButton label="+ Add photo" onUploaded={(url) => onChange([...images, url])} />
      </div>
    </div>
  );
}
