// Welcome message job worker
// Processes jobs from the welcome-message queue and generates personalized messages via Ollama

import { Job } from 'bullmq';
import { createWorker, QUEUE_NAMES } from '../index';
import { generateWelcomeMessage, checkOllamaHealth, type WelcomeMessageData } from '@/lib/ollama';
import { getDb } from '@/lib/db';
import { getUnit } from '@/lib/units';
import { formatDate } from '@/lib/utils';

// Job data interface
export interface WelcomeMessageJobData {
  bookingId: string;
  guestName: string;
  email: string;
  unitSlug: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
}

// Job result interface
export interface WelcomeMessageJobResult {
  bookingId: string;
  message: string;
  generatedAt: string;
}

const worker = createWorker<WelcomeMessageJobData, WelcomeMessageJobResult>(
  QUEUE_NAMES.WELCOME_MESSAGE,
  async (job: Job<WelcomeMessageJobData>) => {
    const { bookingId, guestName, unitSlug, checkIn, checkOut, guests, specialRequests } = job.data;

    console.log(`[welcome-message] Processing job ${job.id} for booking ${bookingId}`);

    // Update job progress
    await job.updateProgress(10);

    // Fetch property/unit details
    const unit = getUnit(unitSlug);
    if (!unit) {
      throw new Error(`Unit not found: ${unitSlug}`);
    }

    await job.updateProgress(30);

    // Check Ollama health
    const health = await checkOllamaHealth();
    if (!health.healthy) {
      console.warn('[welcome-message] Ollama not healthy, using fallback message');
      // Use fallback message instead of failing
      const fallbackMessage = generateFallbackWelcomeMessage(guestName, unit, checkIn, checkOut);
      await saveWelcomeMessage(bookingId, fallbackMessage);
      return { bookingId, message: fallbackMessage, generatedAt: new Date().toISOString() };
    }

    await job.updateProgress(50);

    // Build data for welcome message generation
    const welcomeData: WelcomeMessageData = {
      guestName,
      propertyName: unit.name,
      propertyType: unit.bedrooms === 0 ? 'studio' : 'apartment',
      checkIn,
      checkOut,
      guests,
      specialRequests,
      amenities: unit.amenities,
      location: 'Club Mykonos, Langebaan',
    };

    // Generate personalized message via Ollama
    const message = await generateWelcomeMessage(welcomeData);

    await job.updateProgress(80);

    // Save the generated message
    await saveWelcomeMessage(bookingId, message);

    await job.updateProgress(100);

    console.log(`[welcome-message] Job ${job.id} completed for booking ${bookingId}`);

    return { bookingId, message, generatedAt: new Date().toISOString() };
  },
  {
    concurrency: 2, // Limit concurrent Ollama requests
    limiter: { max: 10, duration: 60000 }, // Max 10 jobs per minute
    deadLetterQueue: QUEUE_NAMES.DEAD_LETTER,
  }
);

// Fallback message when Ollama is unavailable
function generateFallbackWelcomeMessage(
  guestName: string,
  unit: { name: string; tagline: string; amenities: string[] },
  checkIn: string,
  checkOut: string
): string {
  const amenities = unit.amenities.slice(0, 3).join(', ');
  const nights = Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  return `Dear ${guestName},

Welcome to Kaliva 185 Langebaan! We're delighted to confirm your stay at ${unit.name} — ${unit.tagline} — from ${formatDate(checkIn)} to ${formatDate(checkOut)} (${nights} night${nights > 1 ? 's' : ''}).

Your apartment features ${amenities}, perfect for a relaxing West Coast getaway. You'll love the lagoon views and easy access to Club Mykonos amenities including the pool, tennis courts, and nearby beaches.

Check-in is from 14:00 and check-out by 10:00. Our team will be in touch with access details closer to your arrival. If you have any questions or special requests, please don't hesitate to reach out — we're here to make your stay memorable.

Warm regards,
The Kaliva 185 Team`;
}

// Save welcome message to database (or file fallback)
async function saveWelcomeMessage(bookingId: string, message: string): Promise<void> {
  const db = await getDb();
  if (db) {
    try {
      // Store in a welcome_messages table or as JSON on the booking
      // For now, we'll add it as a message in the enquiry thread
      await db.enquiryMessage.create({
        data: {
          bookingId,
          author: 'system',
          body: `[Welcome Message Generated]\n${message}`,
        },
      });
      console.log(`[welcome-message] Saved welcome message for booking ${bookingId}`);
      return;
    } catch (error) {
      console.warn('[welcome-message] DB save failed, using file fallback:', error);
    }
  }

  // File fallback
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const filePath = path.join(process.cwd(), '.data', 'welcome-messages.json');

  try {
    let messages: Record<string, string> = {};
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      messages = JSON.parse(content);
    } catch {
      // File doesn't exist yet
    }
    messages[bookingId] = message;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf-8');
  } catch (error) {
    console.error('[welcome-message] Failed to save welcome message:', error);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[welcome-message] Shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[welcome-message] Shutting down worker...');
  await worker.close();
  process.exit(0);
});

export { worker };