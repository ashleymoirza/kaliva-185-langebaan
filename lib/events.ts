// Event system for booking-related events
// Allows loose coupling between booking creation and background jobs

type EventHandler<T = unknown> = (data: T) => Promise<void> | void;

interface EventMap {
  'booking:created': BookingCreatedEvent;
  'booking:confirmed': BookingConfirmedEvent;
  'booking:cancelled': BookingCancelledEvent;
  'payment:completed': PaymentCompletedEvent;
  'payment:failed': PaymentFailedEvent;
}

interface BookingCreatedEvent {
  bookingId: string;
  guestName: string;
  email: string;
  phone: string;
  unitSlug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
  paymentMethod: string;
  totalCents: number;
  depositCents?: number;
}

interface BookingConfirmedEvent {
  bookingId: string;
  guestName: string;
  email: string;
  unitSlug: string;
  checkIn: string;
  checkOut: string;
}

interface BookingCancelledEvent {
  bookingId: string;
  guestName: string;
  email: string;
  reason?: string;
}

interface PaymentCompletedEvent {
  bookingId: string;
  amountCents: number;
  gateway: string;
  transactionId: string;
}

interface PaymentFailedEvent {
  bookingId: string;
  amountCents: number;
  gateway: string;
  reason: string;
}

class EventEmitter {
  private handlers = new Map<keyof EventMap, Set<EventHandler>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  async emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    console.log(`[events] Emitting ${event} for booking ${data.bookingId}`);

    // Execute all handlers in parallel, but don't let one failure block others
    await Promise.allSettled(
      Array.from(handlers).map(async (handler) => {
        try {
          await handler(data);
        } catch (error) {
          console.error(`[events] Handler for ${event} failed:`, error);
        }
      })
    );
  }

  // Get handler count for debugging
  listenerCount<K extends keyof EventMap>(event: K): number {
    return this.handlers.get(event)?.size || 0;
  }
}

// Singleton instance
export const events = new EventEmitter();

// Event names as constants for type safety
export const EVENTS = {
  BOOKING_CREATED: 'booking:created' as const,
  BOOKING_CONFIRMED: 'booking:confirmed' as const,
  BOOKING_CANCELLED: 'booking:cancelled' as const,
  PAYMENT_COMPLETED: 'payment:completed' as const,
  PAYMENT_FAILED: 'payment:failed' as const,
} as const;

export type {
  BookingCreatedEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
};