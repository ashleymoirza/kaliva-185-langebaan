/** Client-side Meta Pixel event helper. Safe to call on the server (no-op there). */
export type MetaEvent =
  | "PageView"
  | "ViewContent"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead"
  | "Contact";

export function trackMeta(event: MetaEvent, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
  if (typeof fbq === "function") fbq("track", event, params ?? {});
}
