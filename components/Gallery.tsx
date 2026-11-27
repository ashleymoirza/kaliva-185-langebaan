"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : ["/images/units/placeholder.svg"];

  return (
    <div className="rounded-2xl overflow-hidden bg-sand-50 shadow-card">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={list[active]}
          alt={`${alt} — photo ${active + 1}`}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover transition-opacity duration-300"
          priority
        />
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setActive((active - 1 + list.length) % list.length)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/90 text-brand-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-110"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button
              type="button"
              onClick={() => setActive((active + 1) % list.length)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/90 text-brand-600 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:scale-110"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" role="tablist" aria-label="Photo indicators">
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-selected={i === active}
                  role="tab"
                  className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    i === active ? "bg-white w-6" : "bg-white/60 hover:bg-white"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="p-3" role="group" aria-label="Photo thumbnails">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {list.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition-all duration-200",
                  i === active ? "ring-brand-500 shadow-md" : "ring-transparent hover:ring-brand-200"
                )}
              >
                <Image src={src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}