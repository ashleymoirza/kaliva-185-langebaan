// Worker entry point
// Run with: npx tsx lib/queue/worker-entry.ts
// Or compile and run with node

import { initializeEventHandlers } from '@/lib/queue/event-handlers';
import './workers/welcome-message'; // Import to register the worker

// Initialize event handlers (connects events to queues)
initializeEventHandlers();

console.log('[worker] Background job workers started');
console.log('[worker] Listening for jobs on queues:', [
  'welcome-message',
  'booking-confirmation-email',
  'reminder-notification',
  'report-generation',
]);

// Keep the process alive
process.stdin.resume();

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`[worker] Received ${signal}, shutting down gracefully...`);

  try {
    const { closeAllQueues } = await import('./index');
    await closeAllQueues();
    console.log('[worker] All queues closed');
    process.exit(0);
  } catch (error) {
    console.error('[worker] Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[worker] Uncaught exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[worker] Unhandled rejection:', reason);
});