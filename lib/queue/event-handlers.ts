// Event handler registration
// Connects booking events to background job queues

import { events, EVENTS, type BookingCreatedEvent, type BookingConfirmedEvent, type BookingCancelledEvent, type PaymentCompletedEvent, type PaymentFailedEvent } from '@/lib/events';
import { addJob } from '@/lib/queue';
import { QUEUE_NAMES } from '@/lib/queue/config';

let initialized = false;

export function initializeEventHandlers(): void {
  if (initialized) {
    console.log('[events] Handlers already initialized');
    return;
  }

  // When a booking is created, queue a welcome message generation job
  events.on(EVENTS.BOOKING_CREATED, async (data: BookingCreatedEvent) => {
    console.log(`[events] Booking created: ${data.bookingId}, queueing welcome message`);

    try {
      await addJob(
        QUEUE_NAMES.WELCOME_MESSAGE,
        'generate-welcome-message',
        {
          bookingId: data.bookingId,
          guestName: data.guestName,
          email: data.email,
          unitSlug: data.unitSlug,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          guests: data.guests,
          specialRequests: data.specialRequests,
        },
        {
          delay: 1000, // Small delay to let booking fully persist
          priority: 10, // High priority for welcome messages
        }
      );
      console.log(`[events] Welcome message job queued for booking ${data.bookingId}`);
    } catch (error) {
      console.error(`[events] Failed to queue welcome message for ${data.bookingId}:`, error);
      // Don't throw - we don't want to block the booking response
    }
  });

  // When booking is confirmed (payment completed), could send confirmation email
  events.on(EVENTS.BOOKING_CONFIRMED, async (data) => {
    console.log(`[events] Booking confirmed: ${data.bookingId}`);
    // Could queue a confirmation email job here
    // await addJob(QUEUE_NAMES.BOOKING_CONFIRMATION_EMAIL, 'send-confirmation', data);
  });

  // When payment fails, could queue a retry notification
  events.on(EVENTS.PAYMENT_FAILED, async (data) => {
    console.log(`[events] Payment failed for booking ${data.bookingId}: ${data.reason}`);
    // Could queue a notification job here
  });

  initialized = true;
  console.log('[events] Event handlers initialized');
}

// Helper to emit booking created event from the booking API
export async function emitBookingCreated(data: BookingCreatedEvent): Promise<void> {
  await events.emit(EVENTS.BOOKING_CREATED, data);
}

export async function emitBookingConfirmed(data: BookingConfirmedEvent): Promise<void> {
  await events.emit(EVENTS.BOOKING_CONFIRMED, data);
}

export async function emitBookingCancelled(data: BookingCancelledEvent): Promise<void> {
  await events.emit(EVENTS.BOOKING_CANCELLED, data);
}

export async function emitPaymentCompleted(data: PaymentCompletedEvent): Promise<void> {
  await events.emit(EVENTS.PAYMENT_COMPLETED, data);
}

export async function emitPaymentFailed(data: PaymentFailedEvent): Promise<void> {
  await events.emit(EVENTS.PAYMENT_FAILED, data);
}

// Re-export types for convenience
export type {
  BookingCreatedEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
} from '@/lib/events';