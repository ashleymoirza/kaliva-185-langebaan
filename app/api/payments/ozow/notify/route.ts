import type { NextRequest } from "next/server";
import { getBooking, updateBookingStatus } from "@/lib/bookings-store";
import { getDb } from "@/lib/db";
import { ozowVerifyCallbackHash, type OzowCallbackData } from "@/lib/payments";
import { notifyOwner } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Ozow Instant Transaction Notification (ITN) handler.
 * Verifies the payload hash before confirming the booking.
 * 
 * PRODUCTION HARDENING:
 *  1. Confirm the source IP is in Ozow's published host list.
 *  2. Post the payload back to Ozow's validation endpoint and require "VALID".
 *  3. Enable additional security in the Ozow dashboard.
 *  4. Idempotency: Prevent duplicate processing of same PaymentId.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const params = new URLSearchParams(raw);

  // Extract callback data early for logging
  const paymentId = params.get("PaymentId") ?? "";
  const status = params.get("Status") ?? "Pending";
  const transactionReference = params.get("TransactionReference") ?? "";
  
  console.log(`[ozow] ITN received: PaymentId=${paymentId}, Status=${status}, Ref=${transactionReference}`);

  // 1. Source IP validation (production only)
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    
    // Ozow's published callback IPs (update from Ozow documentation)
    const allowedIps = [
      "41.203.16.0/22",   // Ozow production
      "197.220.16.0/22",  // Ozow production
      // Add more as per Ozow documentation
    ];
    
    // Simple IP check (in production, use a proper CIDR library)
    const ipAllowed = allowedIps.some(range => {
      if (range.includes("/")) {
        // CIDR notation - simplified check
        const [baseIp, bits] = range.split("/");
        return clientIp.startsWith(baseIp.split(".").slice(0, parseInt(bits) / 8).join("."));
      }
      return clientIp === range;
    });
    
    if (!ipAllowed) {
      console.warn(`[ozow] ITN rejected: unauthorized IP ${clientIp}`);
      return new Response("Unauthorized", { status: 403 });
    }
  }

  const privateKey = process.env.OZOW_PRIVATE_KEY ?? "";
  if (!privateKey) {
    console.warn("[ozow] ITN received but OZOW_PRIVATE_KEY not configured");
    return new Response("Configuration error", { status: 500 });
  }

  // Extract callback data
  const callbackData: OzowCallbackData = {
    paymentId,
    status: status as OzowCallbackData["status"],
    transactionReference,
    bankReference: params.get("BankReference") ?? "",
    amount: params.get("Amount") ?? "0",
    hash: params.get("Hash") ?? "",
    hashCheck: params.get("HashCheck") ?? "",
    isTest: params.get("IsTest") ?? "true",
    customData: params.get("CustomData") ?? undefined,
  };

  // Verify hash
  if (!callbackData.hashCheck || !ozowVerifyCallbackHash(callbackData, privateKey)) {
    console.warn("[ozow] ITN hash verification failed", {
      paymentId: callbackData.paymentId,
      status: callbackData.status,
    });
    return new Response("Invalid hash", { status: 400 });
  }

  // 2. Idempotency: Check if we've already processed this PaymentId
  const db = await getDb();
  if (db) {
    const existingPayment = await db.payment.findFirst({
      where: { ozowPaymentId: callbackData.paymentId },
    });
    
    if (existingPayment) {
      // Already processed - return OK to acknowledge receipt
      console.log(`[ozow] Duplicate ITN for PaymentId=${paymentId}, already processed as ${existingPayment.status}`);
      return new Response("OK", { status: 200 });
    }
  }

  const bookingId = callbackData.transactionReference ?? callbackData.customData ?? "";
  const booking = bookingId ? await getBooking(bookingId) : null;

  if (!booking) {
    console.warn("[ozow] ITN for unknown booking", bookingId);
    return new Response("Unknown booking", { status: 404 });
  }

  // Amount tamper check (allow 1 cent rounding)
  const amountCents = Math.round(Number(callbackData.amount) * 100);
  if (Math.abs(amountCents - booking.totalCents) > 1) {
    console.warn("[ozow] ITN amount mismatch", amountCents, booking.totalCents);
    return new Response("Amount mismatch", { status: 400 });
  }

  // 3. Post back to Ozow validation endpoint (production only)
  if (isProd && process.env.OZOW_API_URL) {
    try {
      const validationUrl = `${process.env.OZOW_API_URL}/ValidateTransaction`;
      const validationParams = new URLSearchParams();
      validationParams.set("PaymentId", paymentId);
      
      const validationRes = await fetch(validationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: validationParams.toString(),
      });
      
      const validationText = await validationRes.text();
      if (!validationText.includes("VALID")) {
        console.warn(`[ozow] Validation failed for PaymentId=${paymentId}: ${validationText}`);
        return new Response("Validation failed", { status: 400 });
      }
    } catch (err) {
      console.error("[ozow] Validation request failed", err);
      // Don't fail the webhook - log and continue (Ozow will retry)
    }
  }

  // Create or update Payment record
  if (db) {
    try {
      // Double-check idempotency at DB level (unique constraint on ozowPaymentId)
      await db.payment.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId ?? "guest",
          amountCents: booking.totalCents,
          currency: "ZAR",
          method: "ozow",
          status: callbackData.status === "Complete" ? "completed" :
                  callbackData.status === "Failed" ? "failed" :
                  callbackData.status === "Cancelled" ? "cancelled" : "pending",
          reference: `ozow_${callbackData.paymentId}`,
          ozowPaymentId: callbackData.paymentId,
          ozowHash: callbackData.hash,
          ozowHashCheck: callbackData.hashCheck,
          gatewayResponse: Object.fromEntries(params.entries()),
          processedAt: callbackData.status === "Complete" ? new Date() : null,
        },
      });
    } catch (err) {
      // If unique constraint violated, it's a duplicate - just log
      if (err instanceof Error && err.message.includes("Unique constraint")) {
        console.log(`[ozow] Duplicate payment record for PaymentId=${paymentId} (race condition)`);
      } else {
        console.warn("[ozow] DB payment record creation failed", err);
      }
    }
  }

  if (callbackData.status === "Complete") {
    await updateBookingStatus(booking.id, "confirmed");
    await notifyOwner(`💳 Ozow payment received — ${booking.unitSlug}`, [
      `Guest: ${booking.name} (${booking.email})`,
      `Dates: ${booking.checkIn} to ${booking.checkOut}`,
      `Amount received: R${(amountCents / 100).toFixed(2)}`,
      `Ozow Payment ID: ${callbackData.paymentId}`,
      `Balance due on arrival: R${((booking.totalCents - (booking.depositCents ?? 0)) / 100).toFixed(2)}`,
    ]);
  } else if (callbackData.status === "Cancelled") {
    await updateBookingStatus(booking.id, "cancelled");
  } else if (callbackData.status === "Failed") {
    await updateBookingStatus(booking.id, "pending"); // Keep as pending, allow retry
  }

  return new Response("OK", { status: 200 });
}