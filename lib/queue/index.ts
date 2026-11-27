// Queue factory for creating and managing BullMQ queues
import { Queue, QueueOptions, Worker, Job, QueueEvents } from 'bullmq';
import { getRedisConfig, QUEUE_NAMES, type QueueName, type RedisConfig } from './config';
import { createHmac } from 'node:crypto';

// Re-export for convenience
export { QUEUE_NAMES };
export type { QueueName, RedisConfig };

// Singleton queues to avoid multiple connections
const queues = new Map<QueueName, Queue>();
const workers = new Map<string, Worker>();
const queueEvents = new Map<QueueName, QueueEvents>();

let redisConfig: RedisConfig | null = null;

export function getQueueRedisConfig(): RedisConfig {
  if (!redisConfig) {
    redisConfig = getRedisConfig();
  }
  return redisConfig;
}

function getConnection() {
  const config = getQueueRedisConfig();
  // BullMQ v5 uses ioredis directly, so we return the config object
  // The Queue constructor will create the ioredis connection internally
  return config;
}

export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const queue = new Queue(name, {
      connection: getConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    } as QueueOptions);
    queues.set(name, queue);
  }
  return queues.get(name)!;
}

export function getQueueEvents(name: QueueName): QueueEvents {
  if (!queueEvents.has(name)) {
    const events = new QueueEvents(name, { connection: getConnection() });
    queueEvents.set(name, events);
  }
  return queueEvents.get(name)!;
}

export interface JobHandler<T = unknown, R = void> {
  (job: Job<T>): Promise<R>;
}

/**
 * Generate idempotency key from job data
 * Ensures same job data produces same key
 */
export function generateIdempotencyKey(name: QueueName, jobName: string, data: unknown): string {
  const payload = JSON.stringify({ name, jobName, data }, Object.keys(data as object).sort());
  return createHmac('sha256', process.env.ADMIN_SESSION_SECRET || 'fallback-secret')
    .update(payload)
    .digest('hex')
    .slice(0, 32);
}

export interface JobHandler<T = unknown, R = void> {
  (job: Job<T>): Promise<R>;
}

export function createWorker<T = unknown, R = void>(
  name: QueueName,
  handler: JobHandler<T, R>,
  options?: { 
    concurrency?: number; 
    limiter?: { max: number; duration: number };
    deadLetterQueue?: QueueName;
  }
): Worker {
  const workerKey = `${name}:worker`;
  if (workers.has(workerKey)) {
    return workers.get(workerKey)! as Worker;
  }

  const deadLetterQueue = options?.deadLetterQueue 
    ? getQueue(options.deadLetterQueue)
    : null;

  const worker = new Worker(name, async (job) => {
    try {
      await handler(job);
    } catch (error) {
      console.error(`[worker:${name}] Job ${job.id} failed:`, error);
      
      // Move to dead letter queue if configured and max attempts reached
      if (deadLetterQueue && job.attemptsMade >= (job.opts.attempts || 3)) {
        console.warn(`[worker:${name}] Job ${job.id} moved to dead letter queue`);
        await deadLetterQueue.add('dead-letter', {
          originalQueue: name,
          originalJobName: job.name,
          originalJobId: job.id,
          data: job.data,
          error: error instanceof Error ? error.message : String(error),
          failedAt: new Date().toISOString(),
          attemptsMade: job.attemptsMade,
        });
      }
      
      throw error; // Re-throw to trigger retry logic
    }
  }, {
    connection: getConnection(),
    concurrency: options?.concurrency || 5,
    limiter: options?.limiter,
  });

  worker.on('completed', (job) => {
    console.log(`[worker:${name}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker:${name}] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[worker:${name}] Worker error:`, err);
  });

  workers.set(workerKey, worker);
  return worker;
}

export async function addJob<T = unknown>(
  name: QueueName,
  jobName: string,
  data: T,
  options?: { 
    delay?: number; 
    priority?: number; 
    jobId?: string;
    idempotencyKey?: string; // Custom idempotency key
  }
): Promise<string> {
  const queue = getQueue(name);
  
  // Generate idempotency key if not provided
  const idempotencyKey = options?.idempotencyKey || generateIdempotencyKey(name, jobName, data);
  
  // Check for existing job with same idempotency key
  const existingJob = await queue.getJob(idempotencyKey);
  if (existingJob) {
    console.log(`[queue:${name}] Job with idempotency key ${idempotencyKey} already exists: ${existingJob.id}`);
    return existingJob.id!;
  }
  
  const job = await queue.add(jobName, data, {
    delay: options?.delay,
    priority: options?.priority,
    jobId: options?.jobId || idempotencyKey,
  });
  return job.id!;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    ...Array.from(queues.values()).map(q => q.close()),
    ...Array.from(workers.values()).map(w => w.close()),
    ...Array.from(queueEvents.values()).map(e => e.close()),
  ]);
  queues.clear();
  workers.clear();
  queueEvents.clear();
}

// Health check for queue system
export async function checkQueueHealth(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
  try {
    const config = getQueueRedisConfig();
    const testQueue = new Queue('health-check', { connection: config });
    await testQueue.add('test', { timestamp: Date.now() });
    await testQueue.close();
    return { healthy: true, details: { redis: config.host } };
  } catch (error) {
    return { healthy: false, details: { error: error instanceof Error ? error.message : 'Unknown error' } };
  }
}