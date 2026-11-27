// Server-only module (uses node:crypto; never import from a Client Component).
import { createHash } from "node:crypto";

/**
 * Payment integration. NO card data ever touches this server — both gateways use
 * hosted payment pages / redirects. Card numbers only exist on PayFast/Stripe.
 */

export interface PaymentIntent {
  gateway: "payfast" | "stripe" | "ozow";
  redirectUrl: string;
  reference: string;
}

// ── PayFast ────────────────────────────────────────────────────────────────
const PAYFAST_PROCESS = "https://www.payfast.co.za/eng/process";
const PAYFAST_SANDBOX = "https://sandbox.payfast.co.za/eng/process";

export interface PayfastFields {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  email_address: string;
  m_payment_id: string;
  amount: string; // "1234.56"
  item_name: string;
  item_description?: string;
  custom_str1?: string;
  custom_str2?: string;
}

/**
 * PayFast signature = MD5 of the URL-encoded, ordered field string with the
 * passphrase appended. Uses PHP-style encoding (spaces as '+') to match PayFast.
 */
export function payfastSignature(fields: Record<string, string | undefined>, passphrase = ""): string {
  const entries = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && `${v}`.length > 0)
    .map(([k, v]) => [k, String(v)] as [string, string]);
  const body = new URLSearchParams(entries).toString();
  const withPass = passphrase ? `${body}&passphrase=${encodeURIComponent(passphrase)}` : body;
  return createHash("md5").update(withPass).digest("hex");
}

export function buildPayfastRedirect(
  fields: PayfastFields,
  opts: { passphrase?: string; sandbox?: boolean } = {},
): string {
  const signature = payfastSignature(fields as unknown as Record<string, string>, opts.passphrase ?? "");
  const params = new URLSearchParams(
    Object.entries(fields)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)] as [string, string]),
  );
  params.set("signature", signature);
  const base = opts.sandbox ? PAYFAST_SANDBOX : PAYFAST_PROCESS;
  return `${base}?${params.toString()}`;
}

export function payfastConfigured(): boolean {
  return Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY);
}

// ── Stripe (Checkout Session via REST — no SDK dependency) ──────────────────
export interface StripeLineItem {
  name: string;
  amountCents: number; // ZAR cents
  quantity: number;
}

export async function createStripeCheckout(args: {
  lineItems: StripeLineItem[];
  successUrl: string;
  cancelUrl: string;
  reference: string;
  customerEmail?: string;
}): Promise<PaymentIntent> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", args.successUrl);
  body.set("cancel_url", args.cancelUrl);
  body.set("client_reference_id", args.reference);
  if (args.customerEmail) body.set("customer_email", args.customerEmail);
  args.lineItems.forEach((item, i) => {
    body.set(`line_items[${i}][quantity]`, String(item.quantity));
    body.set(`line_items[${i}][price_data][currency]`, "zar");
    body.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(item.amountCents)));
    body.set(`line_items[${i}][price_data][product_data][name]`, item.name);
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !json.url) {
    throw new Error(json.error?.message ?? `Stripe error (HTTP ${res.status})`);
  }
  return { gateway: "stripe", redirectUrl: json.url, reference: json.id ?? args.reference };
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// ── Ozow (South Africa) ─────────────────────────────────────────────────────
export interface OzowFields {
  siteCode: string;
  countryCode: string;
  currencyCode: string;
  amount: string; // Major units with 2 decimals, e.g., "1234.56"
  transactionReference: string;
  bankReference: string;
  isTest: boolean;
  notifyUrl: string;
  returnUrl: string;
  cancelUrl: string;
  errorUrl: string;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;
  customData?: string;
}

export interface OzowPaymentResponse {
  paymentId: string;
  url: string;
  hash: string;
}

export interface OzowCallbackData {
  paymentId: string;
  status: "Complete" | "Failed" | "Cancelled" | "Pending";
  transactionReference: string;
  bankReference: string;
  amount: string;
  hash: string;
  hashCheck: string;
  isTest: string;
  customData?: string;
}

const OZOW_API_URL = process.env.OZOW_API_URL ?? "https://api.ozow.com";
const OZOW_POST_PAYMENT = "/PostPayment";

/**
 * Generate Ozow SHA512 hash for request verification.
 * Hash = SHA512(SiteCode + CountryCode + CurrencyCode + Amount + TransactionReference +
 *         BankReference + IsTest + NotifyUrl + ReturnUrl + CancelUrl + ErrorUrl +
 *         CustomerFirstName + CustomerLastName + CustomerEmail + CustomerPhone +
 *         CustomData + PrivateKey)
 */
export function ozowGenerateHash(fields: OzowFields, privateKey: string): string {
  const parts = [
    fields.siteCode,
    fields.countryCode,
    fields.currencyCode,
    fields.amount,
    fields.transactionReference,
    fields.bankReference,
    fields.isTest ? "true" : "false",
    fields.notifyUrl,
    fields.returnUrl,
    fields.cancelUrl,
    fields.errorUrl,
    fields.customerFirstName,
    fields.customerLastName,
    fields.customerEmail,
    fields.customerPhone ?? "",
    fields.customData ?? "",
    privateKey,
  ];
  const hashInput = parts.join("");
  return createHash("sha512").update(hashInput).digest("hex").toUpperCase();
}

/**
 * Verify Ozow callback hash.
 * HashCheck = SHA512(PaymentId + Status + TransactionReference + BankReference +
 *              Amount + IsTest + CustomData + PrivateKey)
 */
export function ozowVerifyCallbackHash(data: OzowCallbackData, privateKey: string): boolean {
  const parts = [
    data.paymentId,
    data.status,
    data.transactionReference,
    data.bankReference,
    data.amount,
    data.isTest,
    data.customData ?? "",
    privateKey,
  ];
  const hashInput = parts.join("");
  const expectedHash = createHash("sha512").update(hashInput).digest("hex").toUpperCase();
  return expectedHash === data.hashCheck.toUpperCase();
}

export async function createOzowPayment(fields: OzowFields): Promise<OzowPaymentResponse> {
  const privateKey = process.env.OZOW_PRIVATE_KEY;
  const siteCode = process.env.OZOW_SITE_CODE;
  if (!privateKey || !siteCode) {
    throw new Error("OZOW_PRIVATE_KEY and OZOW_SITE_CODE must be configured.");
  }

  const hash = ozowGenerateHash(fields, privateKey);

  const body = new URLSearchParams();
  body.set("SiteCode", fields.siteCode);
  body.set("CountryCode", fields.countryCode);
  body.set("CurrencyCode", fields.currencyCode);
  body.set("Amount", fields.amount);
  body.set("TransactionReference", fields.transactionReference);
  body.set("BankReference", fields.bankReference);
  body.set("IsTest", fields.isTest ? "true" : "false");
  body.set("NotifyUrl", fields.notifyUrl);
  body.set("ReturnUrl", fields.returnUrl);
  body.set("CancelUrl", fields.cancelUrl);
  body.set("ErrorUrl", fields.errorUrl);
  body.set("CustomerFirstName", fields.customerFirstName);
  body.set("CustomerLastName", fields.customerLastName);
  body.set("CustomerEmail", fields.customerEmail);
  if (fields.customerPhone) body.set("CustomerPhone", fields.customerPhone);
  if (fields.customData) body.set("CustomData", fields.customData);
  body.set("Hash", hash);

  const res = await fetch(`${OZOW_API_URL}${OZOW_POST_PAYMENT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  const json = (await res.json()) as {
    PaymentId?: string;
    Url?: string;
    Hash?: string;
    ErrorMessage?: string;
    ResultCode?: string;
  };

  if (!res.ok || !json.Url || !json.PaymentId) {
    throw new Error(json.ErrorMessage ?? `Ozow error (HTTP ${res.status})`);
  }

  return { paymentId: json.PaymentId, url: json.Url, hash: json.Hash ?? "" };
}

export function ozowConfigured(): boolean {
  return Boolean(process.env.OZOW_SITE_CODE && process.env.OZOW_PRIVATE_KEY);
}
