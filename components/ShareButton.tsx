"use client"
import { cn } from "@/lib/utils";
import { formatZAR } from "@/lib/utils";
import { useState } from "react";

export interface ShareLinkProps {
  bookingId: string;
  depositPercent?: number;
  onShare?: (text: string) => void;
}

export function ShareButton({ bookingId, depositPercent = 50, onShare }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);
  const shareText = `I just booked Kaliva 185 Langebaan with a ${depositPercent}% deposit! Book your stay: https://kaliva185.duckdns.org/book/${bookingId}`;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => {
          navigator.clipboard.writeText(shareText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            if (onShare) onShare(shareText);
          });
        }}
        className={cn(
          "btn-base",
          copied ? "btn-primary" : "btn-secondary",
          "flex-1",
          "text-sm"
        )}
        aria-label={copied ? "Link copied" : "Share booking link"}
      >
        {copied ? (
          <span>Link copied!</span>
        ) : (
          <span>
            Share
            <svg
              className="inline-block align-middle -mr-1 h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M15.75 3.75l-6 6 1.5 1.5L12 21l7.5-7.5L15.75 3.75z" />
              <path d="M7.5 9.75l3 3h6l-3-3h-6z" />
            </svg>
          </span>
        )}
      </button>
      {copied && (
        <span className="text-xs text-slate-500">Link copied!</span>
      )}
    </div>
  );
}