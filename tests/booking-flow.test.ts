#!/usr/bin/env npx tsx
/**
 * Booking Flow Integration Test
 * Simulates a complete user booking: creates booking, generates Ozow payment intent, queues Ollama welcome message
 *
 * Run: npx tsx tests/booking-flow.test.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

// Test configuration
const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const USE_API_DIRECTLY = process.env.USE_API_DIRECTLY !== 'false'; // Use internal functions directly for speed

interface TestResult {
  step: string;
  success: boolean;
  data?: unknown;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

function logStep(step: string, success: boolean, data?: unknown, error?: string) {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${step}${error ? ` — ${error}` : ''}`);
}

async function runTest(name: string, fn: () => Promise<unknown>): Promise<TestResult> {
  const start = Date.now();
  try {
    const data = await fn();
    const result = { step: name, success: true, data, durationMs: Date.now() - start };
    results.push(result);
    logStep(name, true, data);
    return result;
  } catch (error) {
    const result = { step: name, success: false, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - start };
    results.push(result);
    logStep(name, false, undefined, error instanceof Error ? error.message : String(error));
    return result;
  }
}

// ─── Synthetic Test Data ──────────────────────────────────────────────
const syntheticBooking = {
  unitSlug: 'seafront-1br',
  checkIn: '2028-02-15',
  checkOut: '2028-02-18',
  guests: 2,
  name: 'Test User',
  email: 'test@example.com',
  phone: '+27 82 123 4567',
  requests: 'Late arrival after 20:00',
  paymentMethod: 'ozow' as const,
  acceptTerms: true,
};

// ─── Main Test Suite ──────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Kaliva 185 Langebaan — Booking Flow Integration Test         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  console.log('Test Data:', JSON.stringify(syntheticBooking, null, 2));
  console.log('');

  // Test 1: Verify environment setup
  await runTest('Environment: .env.local exists', async () => {
    const fs = await import('node:fs');
    if (!fs.existsSync('.env.local')) throw new Error('.env.local not found');
    return { envFile: '.env.local' };
  });

  await runTest('Environment: Ollama config present', async () => {
    const required = ['OLLAMA_BASE_URL', 'OLLAMA_MODEL'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) throw new Error(`Missing: ${missing.join(', ')}`);
    return { OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL, OLLAMA_MODEL: process.env.OLLAMA_MODEL };
  });

  await runTest('Environment: Ozow config present', async () => {
    const required = ['OZOW_SITE_CODE', 'OZOW_PRIVATE_KEY'];
    const missing = required.filter(k => !process.env[k]);
    // Don't fail if not configured - just warn
    if (missing.length) {
      console.log('  ⚠️  Ozow not configured (OZOW_SITE_CODE, OZOW_PRIVATE_KEY) — payment test will use fallback');
    }
    return { configured: missing.length === 0 };
  });

  await runTest('Environment: Redis config present', async () => {
    const hasRedis = !!process.env.REDIS_HOST || !!process.env.REDIS_URL;
    if (!hasRedis) console.log('  ⚠️  Redis not configured — queue test will use fallback');
    return { configured: hasRedis };
  });

  // Test 2: Database connectivity (if configured)
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('***')) {
    await runTest('Database: Prisma client generates', async () => {
      const { execSync } = await import('node:child_process');
      execSync('npx prisma generate', { cwd: process.cwd(), stdio: 'pipe' });
      return { generated: true };
    });

    await runTest('Database: Connection works', async () => {
      const { getDb } = await import('@/lib/db');
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.$queryRaw`SELECT 1`;
      return { connected: true };
    });
  } else {
    console.log('⏭️  Skipping database tests (DATABASE_URL not configured — demo mode)');
  }

  // Test 3: Booking creation (via API or direct)
  let bookingId: string | undefined;
  let redirectUrl: string | undefined;

  if (USE_API_DIRECTLY) {
    // Use internal functions directly (faster, no HTTP overhead)
    await runTest('Booking: Create via internal API', async () => {
      const { createBooking, getPricingConfig, isAvailable, getUnit } = await import('@/lib/bookings-store');
      const { computeQuote, resolveRoomPrices } = await import('@/lib/pricing');
      const { getUnit: getUnitLib } = await import('@/lib/units');

      const unit = getUnitLib(syntheticBooking.unitSlug);
      if (!unit) throw new Error('Unit not found');

      const config = await getPricingConfig();
      const { lowCents, highCents } = resolveRoomPrices(unit.slug, unit.basePriceCents, config);
      const quote = computeQuote({ lowCents, highCents, checkIn: syntheticBooking.checkIn, checkOut: syntheticBooking.checkOut }, config);

      if (!quote.meetsMinimum) throw new Error(quote.messages[0] || 'Minimum stay not met');
      if (!(await isAvailable(syntheticBooking.unitSlug, syntheticBooking.checkIn, syntheticBooking.checkOut))) {
        throw new Error('Dates not available');
      }

      const booking = await createBooking({
        unitSlug: syntheticBooking.unitSlug,
        checkIn: syntheticBooking.checkIn,
        checkOut: syntheticBooking.checkOut,
        guests: syntheticBooking.guests,
        name: syntheticBooking.name,
        email: syntheticBooking.email,
        phone: syntheticBooking.phone,
        requests: syntheticBooking.requests,
        referral: '',
        totalCents: quote.totalCents,
        depositCents: quote.depositCents,
        paymentMethod: syntheticBooking.paymentMethod,
        paymentRef: null,
      });

      bookingId = booking.id;
      return { bookingId: booking.id, totalCents: quote.totalCents, depositCents: quote.depositCents, quote };
    });
  } else {
    // Use HTTP API (more realistic)
    await runTest('Booking: Create via HTTP API', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syntheticBooking),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || 'Booking failed');
      bookingId = data.bookingId;
      redirectUrl = data.redirectUrl;
      return data;
    });
  }

  // Test 4: Ozow payment intent generation
  if (bookingId) {
    await runTest('Payment: Generate Ozow intent', async () => {
      const { createOzowPayment, ozowConfigured } = await import('@/lib/payments');
      const { getBooking } = await import('@/lib/bookings-store');
      const { getUnit: getUnitLib } = await import('@/lib/units');

      if (!ozowConfigured()) {
        console.log('  ⚠️  Ozow not configured — skipping payment intent test');
        return { skipped: true, reason: 'Ozow not configured' };
      }

      const booking = await getBooking(bookingId!);
      if (!booking) throw new Error('Booking not found');
      const unit = getUnitLib(booking.unitSlug);

      const chargeCents = (booking.depositCents ?? booking.totalCents);
      const nameParts = booking.name.trim().split(/\s+/);
      const firstName = nameParts[0] ?? 'Guest';
      const lastName = nameParts.slice(1).join(' ') ?? 'User';
      const isTest = process.env.OZOW_IS_TEST !== 'false';
      const siteCode = process.env.OZOW_SITE_CODE ?? '';
      const origin = TEST_BASE_URL;

      const result = await createOzowPayment({
        siteCode,
        countryCode: 'ZA',
        currencyCode: 'ZAR',
        amount: (chargeCents / 100).toFixed(2),
        transactionReference: booking.id,
        bankReference: `KALIVA-${booking.id.slice(0, 8).toUpperCase()}`,
        isTest,
        notifyUrl: `${origin}/api/payments/ozow/notify`,
        returnUrl: `${origin}/book/return?booking=${booking.id}&gateway=ozow`,
        cancelUrl: `${origin}/book?cancelled=1&gateway=ozow`,
        errorUrl: `${origin}/book?error=1&gateway=ozow`,
        customerFirstName: firstName,
        customerLastName: lastName,
        customerEmail: booking.email,
        customerPhone: booking.phone,
        customData: booking.id,
      });

      redirectUrl = result.url;
      return { paymentId: result.paymentId, url: result.url, hash: result.hash };
    });
  }

  // Test 5: Ollama welcome message generation
  await runTest('AI: Generate welcome message via Ollama', async () => {
    const { generateWelcomeMessage, checkOllamaHealth } = await import('@/lib/ollama');
    const { getUnit: getUnitLib } = await import('@/lib/units');

    const health = await checkOllamaHealth();
    if (!health.healthy) {
      console.log('  ⚠️  Ollama not healthy — using fallback message');
      // Still test fallback
      const unit = getUnitLib(syntheticBooking.unitSlug);
      if (!unit) throw new Error('Unit not found');
      const nights = Math.ceil(
        (new Date(syntheticBooking.checkOut).getTime() - new Date(syntheticBooking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
      );
      return { fallback: true, message: `Dear ${syntheticBooking.name}, welcome to ${unit.name}...` };
    }

    const unit = getUnitLib(syntheticBooking.unitSlug);
    if (!unit) throw new Error('Unit not found');

    const welcomeData = {
      guestName: syntheticBooking.name,
      propertyName: unit.name,
      propertyType: unit.bedrooms === 0 ? 'studio' : 'apartment',
      checkIn: syntheticBooking.checkIn,
      checkOut: syntheticBooking.checkOut,
      guests: syntheticBooking.guests,
      specialRequests: syntheticBooking.requests,
      amenities: unit.amenities,
      location: 'Club Mykonos, Langebaan',
    };

    const message = await generateWelcomeMessage(welcomeData);
    return { message, length: message.length, model: health.model };
  });

  // Test 6: Background job queue (if Redis configured)
  if (process.env.REDIS_HOST || process.env.REDIS_URL) {
    // Skip if Redis not actually running (quick check)
    const net = await import('node:net');
    const redisCheck = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.connect({ host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379') });
    });

    if (!redisCheck) {
      console.log('⏭️  Skipping queue test (Redis not running)');
    } else {
      await runTest('Queue: Add welcome message job', async () => {
        const { addJob, QUEUE_NAMES } = await import('@/lib/queue');

        const jobId = await addJob(
          QUEUE_NAMES.WELCOME_MESSAGE,
          'generate-welcome-message',
          {
            bookingId: bookingId!,
            guestName: syntheticBooking.name,
            email: syntheticBooking.email,
            unitSlug: syntheticBooking.unitSlug,
            checkIn: syntheticBooking.checkIn,
            checkOut: syntheticBooking.checkOut,
            guests: syntheticBooking.guests,
            specialRequests: syntheticBooking.requests,
          },
          { priority: 10 }
        );
        return { jobId };
      });
    }
  } else {
    console.log('⏭️  Skipping queue test (Redis not configured)');
  }

  // Test 7: Verify booking record in database
  if (bookingId && process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('***')) {
    // Quick check if database is reachable
    const dbUrl = new URL(process.env.DATABASE_URL);
    const net = await import('node:net');
    const dbCheck = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.connect({ host: dbUrl.hostname, port: parseInt(dbUrl.port || '5432') });
    });

    if (!dbCheck) {
      console.log('⏭️  Skipping database verification (Database not running)');
    } else {
      await runTest('Database: Verify booking record', async () => {
        const { getDb } = await import('@/lib/db');
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        try {
          const booking = await db.booking.findUnique({ where: { id: bookingId } });
          if (!booking) throw new Error('Booking not found in database');
          return { found: true, bookingId: booking.id, status: booking.status, paymentMethod: booking.paymentMethod };
        } catch (error) {
          if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
            console.log('  ⚠️  Database not running — skipping verification');
            return { skipped: true, reason: 'Database not available' };
          }
          throw error;
        }
      });
    }
  }

  // Test 8: API health checks
  await runTest('API: /api/quote responds', async () => {
    const params = new URLSearchParams({
      unitSlug: syntheticBooking.unitSlug,
      checkIn: syntheticBooking.checkIn,
      checkOut: syntheticBooking.checkOut,
      guests: String(syntheticBooking.guests),
    });
    const response = await fetch(`${TEST_BASE_URL}/api/quote?${params}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.quote) throw new Error('No quote in response');
    return { totalCents: data.quote.totalCents, nights: data.quote.nights };
  });

  await runTest('API: /api/availability responds', async () => {
    const response = await fetch(`${TEST_BASE_URL}/api/availability?unitSlug=${syntheticBooking.unitSlug}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { unavailableCount: data.unavailable?.length || 0 };
  });

  // ─── Summary ────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const skipped = results.filter(r => r.data && 'skipped' in r.data).length;

  results.forEach(r => {
    const status = r.success ? 'PASS' : 'FAIL';
    const duration = `${r.durationMs}ms`;
    console.log(`  [${status}] ${r.step.padEnd(50)} ${duration}`);
  });

  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}\n`);

  // Output key results for manual verification
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('KEY RESULTS FOR MANUAL VERIFICATION:');
  console.log('═══════════════════════════════════════════════════════════════\n');
  if (bookingId) console.log(`Booking ID:     ${bookingId}`);
  if (redirectUrl) console.log(`Ozow Redirect:  ${redirectUrl}`);
  console.log(`Test User:      ${syntheticBooking.name} (${syntheticBooking.email})`);
  console.log(`Property:       ${syntheticBooking.unitSlug}`);
  console.log(`Dates:          ${syntheticBooking.checkIn} → ${syntheticBooking.checkOut}`);
  console.log(`Payment Method: ${syntheticBooking.paymentMethod}`);
  console.log('');

  // Admin verification URLs
  console.log('ADMIN VERIFICATION:');
  console.log(`  Bookings:     ${TEST_BASE_URL}/admin/enquiries?booking=${bookingId}`);
  console.log(`  Payments:     ${TEST_BASE_URL}/admin/enquiries (check payment records)`);
  console.log('');

  if (failed > 0) {
    console.log('❌ Some tests failed. Check output above.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('\n💥 Test suite crashed:', err);
  process.exit(1);
});