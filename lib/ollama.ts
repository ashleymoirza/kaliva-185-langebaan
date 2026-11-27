// Ollama service for generating AI-powered content
// Uses local Ollama instance for privacy and cost control

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
  circuitBreakerThreshold?: number; // Failures before circuit opens
  circuitBreakerTimeout?: number;   // Time before attempting reset (ms)
}

export interface GenerateOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onToken?: (token: string) => void;
  fallbackMessage?: string; // Pre-generated fallback for graceful degradation
}

export interface GenerateResponse {
  response: string;
  done: boolean;
  context?: number[];
  totalDuration?: number;
  loadDuration?: number;
  promptEvalCount?: number;
  evalCount?: number;
  evalDuration?: number;
  usedFallback?: boolean; // Indicates fallback was used
}

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
};

function getOllamaConfig(): OllamaConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10),
    maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '3', 10),
    circuitBreakerThreshold: parseInt(process.env.OLLAMA_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
    circuitBreakerTimeout: parseInt(process.env.OLLAMA_CIRCUIT_BREAKER_TIMEOUT || '60000', 10), // 1 minute
  };
}

function checkCircuitBreaker(): { allow: boolean; reason?: string } {
  const config = getOllamaConfig();
  const now = Date.now();
  
  if (circuitBreaker.isOpen) {
    // Check if timeout has passed to attempt half-open state
    if (now - circuitBreaker.lastFailure >= config.circuitBreakerTimeout!) {
      console.log('[ollama] Circuit breaker half-open, allowing test request');
      return { allow: true };
    }
    return { allow: false, reason: 'Circuit breaker open' };
  }
  
  return { allow: true };
}

function recordSuccess(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.isOpen = false;
}

function recordFailure(): void {
  const config = getOllamaConfig();
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();
  
  if (circuitBreaker.failures >= config.circuitBreakerThreshold!) {
    circuitBreaker.isOpen = true;
    console.warn(`[ollama] Circuit breaker opened after ${circuitBreaker.failures} failures`);
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function ollamaGenerate(
  options: GenerateOptions
): Promise<GenerateResponse> {
  const config = getOllamaConfig();
  const { prompt, systemPrompt, temperature = 0.7, maxTokens = 500, stream = false, fallbackMessage } = options;

  // Check circuit breaker
  const circuitCheck = checkCircuitBreaker();
  if (!circuitCheck.allow) {
    console.warn('[ollama] Circuit breaker open, using fallback immediately');
    if (fallbackMessage) {
      return { response: fallbackMessage, done: true, usedFallback: true };
    }
    throw new Error('Ollama circuit breaker open, no fallback available');
  }

  const body = {
    model: config.model,
    prompt,
    system: systemPrompt,
    stream,
    options: {
      temperature,
      num_predict: maxTokens,
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${config.baseUrl}/api/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        config.timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      if (stream && options.onToken) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(Boolean);

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.response) {
                  fullResponse += parsed.response;
                  options.onToken(parsed.response);
                }
                if (parsed.done) {
                  recordSuccess();
                  return {
                    response: fullResponse,
                    done: true,
                    context: parsed.context,
                    totalDuration: parsed.total_duration,
                    evalCount: parsed.eval_count,
                  };
                }
              } catch {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        recordSuccess();
        return { response: fullResponse, done: true };
      }

      // Non-streaming response
      const data = (await response.json()) as GenerateResponse;
      recordSuccess();
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[ollama] Attempt ${attempt}/${config.maxRetries} failed:`, lastError.message);
      recordFailure();

      if (attempt < config.maxRetries) {
        // Exponential backoff with jitter
        const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed - use fallback if provided
  if (fallbackMessage) {
    console.warn('[ollama] All retries failed, using fallback message');
    return { response: fallbackMessage, done: true, usedFallback: true };
  }

  throw lastError || new Error('Ollama generation failed after retries');
}

export async function ollamaChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number; maxTokens?: number; stream?: boolean; onToken?: (token: string) => void }
): Promise<GenerateResponse> {
  const config = getOllamaConfig();

  const body = {
    model: config.model,
    messages,
    stream: options?.stream || false,
    options: {
      temperature: options?.temperature ?? 0.7,
      num_predict: options?.maxTokens ?? 500,
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${config.baseUrl}/api/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        config.timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama Chat API error (${response.status}): ${errorText}`);
      }

      if (options?.stream && options.onToken) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(Boolean);

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.message?.content) {
                  fullResponse += parsed.message.content;
                  options.onToken(parsed.message.content);
                }
                if (parsed.done) {
                  return { response: fullResponse, done: true };
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        return { response: fullResponse, done: true };
      }

      const data = (await response.json()) as { message: { content: string }; done: boolean };
      return { response: data.message.content, done: true };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[ollama:chat] Attempt ${attempt}/${config.maxRetries} failed:`, lastError.message);

      if (attempt < config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  throw lastError || new Error('Ollama chat failed after retries');
}

export async function checkOllamaHealth(): Promise<{ healthy: boolean; model?: string; error?: string }> {
  const config = getOllamaConfig();
  try {
    const response = await fetchWithTimeout(
      `${config.baseUrl}/api/tags`,
      { method: 'GET' },
      5000
    );

    if (!response.ok) {
      return { healthy: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as { models: Array<{ name: string }> };
    const modelExists = data.models.some(m => m.name.startsWith(config.model.split(':')[0]));

    return {
      healthy: true,
      model: modelExists ? config.model : undefined,
      error: modelExists ? undefined : `Model ${config.model} not found. Available: ${data.models.map(m => m.name).join(', ')}`,
    };
  } catch (error) {
    return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Welcome message generation specific functions
export interface WelcomeMessageData {
  guestName: string;
  propertyName: string;
  propertyType: string; // 'apartment', 'cottage', 'villa', 'studio'
  checkIn: string;
  checkOut: string;
  guests: number;
  specialRequests?: string;
  amenities: string[];
  location: string;
}

const WELCOME_SYSTEM_PROMPT = `You are a warm, professional host writing personalized welcome messages for guests at Kaliva 185 Langebaan, a collection of self-catering apartments at Club Mykonos in Langebaan, South Africa.

Write in a friendly, welcoming tone that reflects the relaxed West Coast lifestyle. Keep messages concise (150-250 words), personal, and informative. Include practical details naturally. Never mention you are an AI.`;

function buildWelcomePrompt(data: WelcomeMessageData): string {
  const amenitiesList = data.amenities.slice(0, 5).join(', ');
  const stayDuration = Math.ceil(
    (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  return `Write a personalized welcome message for:

Guest: ${data.guestName}
Property: ${data.propertyName} (${data.propertyType})
Dates: ${data.checkIn} to ${data.checkOut} (${stayDuration} night${stayDuration > 1 ? 's' : ''})
Guests: ${data.guests}
Location: ${data.location}
Key amenities: ${amenitiesList}
${data.specialRequests ? `Special requests: ${data.specialRequests}` : ''}

The message should:
1. Welcome them by name
2. Mention the property and dates
3. Highlight 1-2 relevant amenities
4. Include a warm local touch (West Coast/Langebaan vibe)
5. Mention check-in time (14:00) and check-out (10:00)
6. Offer assistance if needed

Write as if you're the host sending a personal message.`;
}

export async function generateWelcomeMessage(
  data: WelcomeMessageData,
  onToken?: (token: string) => void
): Promise<string> {
  const prompt = buildWelcomePrompt(data);
  
  // Pre-generate fallback message for graceful degradation
  const fallbackMessage = `Dear ${data.guestName},

Welcome to Kaliva 185 Langebaan! We're delighted to confirm your stay at ${data.propertyName} — from ${data.checkIn} to ${data.checkOut}.

Your apartment features ${data.amenities.slice(0, 3).join(', ')}, perfect for a relaxing West Coast getaway. You'll love the lagoon views and easy access to Club Mykonos amenities including the pool, tennis courts, and nearby beaches.

Check-in is from 14:00 and check-out by 10:00. Our team will be in touch with access details closer to your arrival. If you have any questions or special requests, please don't hesitate to reach out — we're here to make your stay memorable.

Warm regards,
The Kaliva 185 Team`;

  const result = await ollamaGenerate({
    prompt,
    systemPrompt: WELCOME_SYSTEM_PROMPT,
    temperature: 0.8,
    maxTokens: 400,
    stream: !!onToken,
    onToken,
    fallbackMessage,
  });
  
  if (result.usedFallback) {
    console.log('[welcome] Used fallback message for booking welcome');
  }
  
  return result.response.trim();
}