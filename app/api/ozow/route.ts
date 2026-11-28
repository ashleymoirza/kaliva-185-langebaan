// Server-only module for Ozow webhook handler
import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";
import { ozowVerifyCallbackHash, ozowConfigured } from "@/lib/payments";

export async function POST(request: Request): Promise<Response> {
  // Check if Ozow is configured
  if (!ozowConfigured()) {
    return NextResponse.json(
      { error: "Ozow not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();

    // Verify the callback hash from Ozow
    const privateKey = process.env.OZOW_PRIVATE_KEY!;
    const hashValid = ozowVerifyCallbackHash(body, privateKey);

    if (!hashValid) {
      console.warn("[ozow/webhook] Invalid hash from callback");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const { paymentId, status, transactionReference, bankReference, amount, isTest } = body;

    // Get Prisma client (falls back to in-memory storage when no DB)
    const db = await getDb();

    // Find or create the payment record
    let paymentIdVal: string;
    if (db) {
      const existing = await db.payment.findFirst({
        where: { ozowPaymentId: paymentId },
      });
      paymentIdVal = existing?.id ?? "";
    } else {
      // Fallback to in-memory (store.json)
      const storePath = process.cwd() + "/.data/store.json";
      // Simple fallback - just use the paymentId as reference
      paymentIdVal = paymentId;
    }

    const reference = paymentIdVal + "-" + Date.now();
    const amountCents = Math.round(parseFloat(amount) * 100);

    if (db) {
      let payment;
      const existing = await db.payment.findFirst({
        where: { ozowPaymentId: paymentId },
      });

      if (existing) {
        payment = await db.payment.update({
          where: { id: existing.id },
          data: {
            status: status as "pending" | "completed" | "failed" | "cancelled" | "refunded",
            ozowHashCheck: body.hashCheck,
            processedAt: new Date(),
            gatewayResponse: body,
          },
        });
      } else {
        payment = await db.payment.create({
          data: {
            reference: reference,
            amountCents: amountCents,
            method: "ozow" as const,
            status: "pending" as const,
            ozowPaymentId: paymentId,
            ozowSiteCode: process.env.OZOW_SITE_CODE!,
            ozowCountryCode: "ZA",
            ozowCurrencyCode: "ZAR",
            ozowAmount: parseFloat(amount).toString(),
            ozowIsTest: isTest === "true",
            ozowHashCheck: body.hashCheck,
            gatewayResponse: body,
          },
        });
      }

      // Update booking status based on payment status
      if (status === "Complete") {
        // Find booking by reference and confirm it
        const bookingMatch = await db.booking.findFirst({
          where: { paymentRef: reference },
        });

        if (bookingMatch) {
          await db.booking.update({
            where: { id: bookingMatch.id },
            data: { status: "confirmed" as const },
          });
        }

        // Send confirmation emails/notifications
        console.log("[ozow/webhook] Booking confirmed:", bookingMatch?.id);
      }

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        status: payment.status,
      });
    } else {
      // Demo mode - just log and return success
      console.log("[ozow/webhook] Demo mode - payment would be processed:", { paymentId, status, amount });
      return NextResponse.json({
        success: true,
        paymentId: paymentId,
        status: status,
        demo: true,
      });
    }
  } catch (error) {
    console.error("[ozow/webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
