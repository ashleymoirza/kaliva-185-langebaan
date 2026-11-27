"use client";

import { useState } from "react";
import { whatsappLink } from "@/lib/site";

export default function WhatsAppButton() {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={whatsappLink("Hi Kaliva 185, I'd like to enquire about availability.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        className="flex items-center gap-3 rounded-2xl bg-[#25D366] px-5 py-3.5 text-sm font-semibold text-white shadow-elevated hover:shadow-elevated hover:bg-[#1ebe5b] transition-all duration-200"
        style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.25 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29Z"/></svg>
        </span>
        <span className="hidden sm:inline">WhatsApp us</span>
      </button>
      <div className="absolute bottom-full right-0 mb-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0">
        <div className="rounded-2xl bg-white px-4 py-3 shadow-elevated border border-sand-200 whitespace-nowrap text-sm font-medium text-slate-700">
          Chat with us on WhatsApp
        </div>
      </div>
    </a>
  );
}