/**
 * Owner notifications when a new enquiry/booking comes in.
 * Channels are chosen purely by which environment variables are set, and each is
 * fire-and-forget: a notification failure never blocks or fails a booking.
 *
 * Easiest to set up: Telegram (free, ~5 minutes, no domain or business account needed).
 */
export interface NotifyResult {
  telegram?: boolean;
  webhook?: boolean;
  email?: boolean;
}

function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}
function webhookConfigured() {
  return Boolean(process.env.NOTIFY_WEBHOOK_URL);
}
function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_EMAIL_TO && process.env.NOTIFY_EMAIL_FROM);
}

export function anyChannelConfigured(): boolean {
  return telegramConfigured() || webhookConfigured() || emailConfigured();
}

/** Which channels are live — used by the admin settings screen. */
export function configuredChannels(): string[] {
  const out: string[] = [];
  if (telegramConfigured()) out.push("Telegram");
  if (webhookConfigured()) out.push("Webhook (Slack / WhatsApp / Make / n8n)");
  if (emailConfigured()) out.push("Email (Resend)");
  return out;
}

async function sendTelegram(title: string, lines: string[]): Promise<boolean> {
  const text = `🔔 *${title}*\n\n${lines.join("\n")}`;
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
  return res.ok;
}

async function sendWebhook(title: string, lines: string[]): Promise<boolean> {
  const res = await fetch(process.env.NOTIFY_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, text: `${title}\n\n${lines.join("\n")}`, lines }),
  });
  return res.ok;
}

async function sendEmail(title: string, lines: string[]): Promise<boolean> {
  const html = `<h2>${title}</h2><p>${lines.join("<br>")}</p>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.NOTIFY_EMAIL_FROM,
      to: [process.env.NOTIFY_EMAIL_TO],
      subject: title,
      html,
    }),
  });
  return res.ok;
}

/** Notify the owner across every configured channel. Never throws. */
export async function notifyOwner(title: string, lines: string[]): Promise<NotifyResult> {
  const result: NotifyResult = {};
  const tasks: Promise<void>[] = [];

  if (telegramConfigured()) tasks.push(sendTelegram(title, lines).then((ok) => { result.telegram = ok; }).catch(() => { result.telegram = false; }));
  if (webhookConfigured()) tasks.push(sendWebhook(title, lines).then((ok) => { result.webhook = ok; }).catch(() => { result.webhook = false; }));
  if (emailConfigured()) tasks.push(sendEmail(title, lines).then((ok) => { result.email = ok; }).catch(() => { result.email = false; }));

  if (!tasks.length) return result;
  await Promise.allSettled(tasks);
  if (Object.values(result).some((v) => v === false)) {
    console.warn("[notify] one or more channels failed", result);
  }
  return result;
}

/** Email a guest (used for CRM replies). Returns false when email isn't configured. */
export async function sendGuestEmail(to: string, subject: string, bodyText: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFY_EMAIL_FROM) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_EMAIL_FROM,
        to: [to],
        subject,
        html: `<div style="font-family:sans-serif;line-height:1.6">${bodyText.replace(/\n/g, "<br>")}</div>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
