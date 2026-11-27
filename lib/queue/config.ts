// Redis connection configuration for BullMQ
// Supports both local development and production environments

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number | null;
  lazyConnect?: boolean;
}

export function getRedisConfig(): RedisConfig {
  // Check for REDIS_URL first (common in production)
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      db: url.pathname.length > 1 ? parseInt(url.pathname.slice(1), 10) : 0,
      maxRetriesPerRequest: null, // Required for BullMQ
      lazyConnect: true,
    };
  }

  // Fallback to individual env vars
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null,
    lazyConnect: true,
  };
}

export const QUEUE_NAMES = {
  WELCOME_MESSAGE: 'welcome-message',
  BOOKING_CONFIRMATION_EMAIL: 'booking-confirmation-email',
  REMINDER_NOTIFICATION: 'reminder-notification',
  REPORT_GENERATION: 'report-generation',
  DEAD_LETTER: 'dead-letter',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];