export interface AIProviderConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'groq' | 'ollama';
  apiKey: string;
  baseUrl?: string;
}

export interface AIRequestOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  text: string;
  provider: string;
}

const AI_TIMEOUT_MS = 30_000;
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10);
const MAX_RETRIES = 2;

export function getAvailableProvider(): AIProviderConfig | null {
  if (process.env.OLLAMA_MODEL) {
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    return { provider: 'ollama', apiKey: '', baseUrl };
  }
  if (process.env.GEMINI_API_KEY) return { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY };
  if (process.env.OPENAI_API_KEY) return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY };
  if (process.env.ANTHROPIC_API_KEY) return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY };
  if (process.env.GROQ_API_KEY) return { provider: 'groq', apiKey: process.env.GROQ_API_KEY };
  return null;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = AI_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    if (retries > 0 && !isAbort) {
      await new Promise(r => setTimeout(r, 500 * (MAX_RETRIES - retries + 1)));
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}

export async function generateContent(options: AIRequestOptions): Promise<AIResponse> {
  const config = getAvailableProvider();
  if (!config) {
    throw new Error('No AI provider configured. Set at least one provider key in server/.env — see .env.example for options.');
  }

  const callers: Record<string, () => Promise<AIResponse>> = {
    ollama: () => callOllama(config.baseUrl || 'http://localhost:11434', options),
    gemini: () => callGemini(config.apiKey, options),
    openai: () => callOpenAI(config.apiKey, options),
    anthropic: () => callAnthropic(config.apiKey, options),
    groq: () => callGroq(config.apiKey, options),
  };

  return withRetry(callers[config.provider]);
}

async function callOllama(baseUrl: string, options: AIRequestOptions): Promise<AIResponse> {
  const model = process.env.OLLAMA_MODEL || 'llama3.2';
  const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: options.prompt }],
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.maxTokens ?? 2048,
      },
    }),
  }, OLLAMA_TIMEOUT_MS);

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Ollama error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const text = data.message?.content || data.response || '';
  if (!text) throw new Error('Ollama returned empty response');
  return { text, provider: `ollama:${model}` };
}

async function callGemini(apiKey: string, options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: options.prompt }] }],
        generationConfig: { temperature: options.temperature ?? 0.3, maxOutputTokens: options.maxTokens ?? 2048 }
      })
    }
  );

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '', provider: 'gemini' };
}

async function callOpenAI(apiKey: string, options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: options.prompt }],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return { text: data.choices?.[0]?.message?.content || '', provider: 'openai' };
}

async function callAnthropic(apiKey: string, options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: options.maxTokens ?? 2048,
      messages: [{ role: 'user', content: options.prompt }]
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return { text: data.content?.[0]?.text || '', provider: 'anthropic' };
}

async function callGroq(apiKey: string, options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: options.prompt }],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return { text: data.choices?.[0]?.message?.content || '', provider: 'groq' };
}

export function extractJSON(text: string): string {
  return text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

export function extractJSONObject(text: string): Record<string, unknown> {
  const cleaned = extractJSON(text);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    return JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')) as Record<string, unknown>;
  }
  throw new Error('No JSON object found in response');
}

export function extractJSONArray(text: string): unknown[] {
  const cleaned = extractJSON(text);
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    return JSON.parse(match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')) as unknown[];
  }
  throw new Error('No JSON array found in response');
}
