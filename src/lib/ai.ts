import ZAI from 'z-ai-web-dev-sdk';

// Singleton ZAI instance
let zaiInstance: ZAI | null = null;

export async function getZAI(): Promise<ZAI> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

/**
 * Non-streaming AI chat completion
 */
export async function aiChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const zai = await getZAI();
  const result = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
    ...(options?.model && { model: options.model }),
    ...(options?.temperature !== undefined && { temperature: options.temperature }),
    ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
  });
  return result.choices[0]?.message?.content || '';
}

/**
 * Streaming AI chat completion - returns the raw stream for consumption
 */
export async function aiChatStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
) {
  const zai = await getZAI();
  const stream = await zai.chat.completions.create({
    messages,
    stream: true,
    thinking: { type: 'disabled' },
    ...(options?.model && { model: options.model }),
    ...(options?.temperature !== undefined && { temperature: options.temperature }),
    ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
  });
  return stream;
}

/**
 * Create a ReadableStream from the AI streaming response
 * for use in Next.js API routes with proper SSE formatting
 */
export function createStreamingResponse(stream: AsyncIterable<any>): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        controller.error(error);
      }
    },
  });
}

/**
 * Parse JSON from AI response, handling potential markdown code blocks
 */
export function parseAIJSON<T>(text: string): T {
  // Remove markdown code block wrapping if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
}
