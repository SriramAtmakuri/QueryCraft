// AI Provider abstraction for multiple API support
// Supports: Gemini, OpenAI, Anthropic, and more

export interface AIProviderConfig {
  provider: 'gemini' | 'openai' | 'anthropic' | 'groq';
  apiKey: string;
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

// Get the first available provider
export function getAvailableProvider(): AIProviderConfig | null {
  // Check providers in order of preference
  if (process.env.GEMINI_API_KEY) {
    return { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.GROQ_API_KEY) {
    return { provider: 'groq', apiKey: process.env.GROQ_API_KEY };
  }
  return null;
}

// Generate content using the available AI provider
export async function generateContent(options: AIRequestOptions): Promise<AIResponse> {
  const config = getAvailableProvider();

  if (!config) {
    throw new Error('No AI API key configured. Set GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY');
  }

  switch (config.provider) {
    case 'gemini':
      return await callGemini(config.apiKey, options);
    case 'openai':
      return await callOpenAI(config.apiKey, options);
    case 'anthropic':
      return await callAnthropic(config.apiKey, options);
    case 'groq':
      return await callGroq(config.apiKey, options);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

// Gemini API
async function callGemini(apiKey: string, options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: options.prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxTokens ?? 2048
        }
      })
    }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, provider: 'gemini' };
}

// OpenAI API
async function callOpenAI(apiKey: string, options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: options.prompt }],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.choices?.[0]?.message?.content || '';
  return { text, provider: 'openai' };
}

// Anthropic API
async function callAnthropic(apiKey: string, options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: options.maxTokens ?? 2048,
      messages: [{ role: 'user', content: options.prompt }]
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.content?.[0]?.text || '';
  return { text, provider: 'anthropic' };
}

// Groq API (free tier available)
async function callGroq(apiKey: string, options: AIRequestOptions): Promise<AIResponse> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [{ role: 'user', content: options.prompt }],
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.choices?.[0]?.message?.content || '';
  return { text, provider: 'groq' };
}

// Helper to clean JSON from response
export function extractJSON(text: string): string {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  return cleaned;
}

// Helper to extract JSON object
export function extractJSONObject(text: string): any {
  const cleaned = extractJSON(text);
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    let jsonStr = match[0]
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    return JSON.parse(jsonStr);
  }
  throw new Error('No JSON object found in response');
}

// Helper to extract JSON array
export function extractJSONArray(text: string): any[] {
  const cleaned = extractJSON(text);
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    let jsonStr = match[0]
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');
    return JSON.parse(jsonStr);
  }
  throw new Error('No JSON array found in response');
}
