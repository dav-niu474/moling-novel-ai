// ============================================================
// 墨灵 (MoLing) - Multi-Provider AI Abstraction Layer
// Supports: NVIDIA, OpenAI, DeepSeek, Qwen, Moonshot, GLM, Doubao, Custom, Built-in
// All external providers use OpenAI-compatible API format
// ============================================================

import { db } from './db';

// Lazy import of z-ai-web-dev-sdk to avoid crashes during module loading
type ZAIType = typeof import('z-ai-web-dev-sdk').default;

let ZAIConstructor: ZAIType | null = null;

async function getZAIClass(): Promise<ZAIType> {
  if (!ZAIConstructor) {
    const mod = await import('z-ai-web-dev-sdk');
    ZAIConstructor = mod.default;
  }
  return ZAIConstructor;
}

// ---- Provider Configuration ----

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  models: { id: string; name: string; maxTokens?: number }[];
  defaultModel: string;
  apiKeyPrefix: string;
  description: string;
}

export const AI_PROVIDERS: ProviderConfig[] = [
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    models: [
      { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', maxTokens: 16384 },
      { id: 'deepseek-ai/deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', maxTokens: 16384 },
      { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', maxTokens: 8192 },
      { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B Instruct', maxTokens: 8192 },
      { id: 'mistralai/mixtral-8x22b-instruct-v0.1', name: 'Mixtral 8x22B Instruct', maxTokens: 8192 },
      { id: 'qwen/qwen2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct', maxTokens: 8192 },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B Instruct', maxTokens: 8192 },
      { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B IT', maxTokens: 8192 },
    ],
    defaultModel: 'deepseek-ai/deepseek-r1',
    apiKeyPrefix: 'nvapi-',
    description: 'NVIDIA NIM 云端推理服务，免费提供多种开源大模型',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', maxTokens: 16384 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', maxTokens: 16384 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', maxTokens: 128000 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', maxTokens: 16384 },
      { id: 'o1-mini', name: 'o1 Mini', maxTokens: 65536 },
      { id: 'o1-preview', name: 'o1 Preview', maxTokens: 32768 },
    ],
    defaultModel: 'gpt-4o-mini',
    apiKeyPrefix: 'sk-',
    description: 'OpenAI 官方 API 服务',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', maxTokens: 8192 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', maxTokens: 8192 },
    ],
    defaultModel: 'deepseek-chat',
    apiKeyPrefix: 'sk-',
    description: 'DeepSeek 深度求索，中文能力出色',
  },
  {
    id: 'qwen',
    name: '通义千问 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-turbo', name: '通义千问 Turbo', maxTokens: 8192 },
      { id: 'qwen-plus', name: '通义千问 Plus', maxTokens: 32768 },
      { id: 'qwen-max', name: '通义千问 Max', maxTokens: 32768 },
      { id: 'qwen-long', name: '通义千问 Long', maxTokens: 10000 },
    ],
    defaultModel: 'qwen-plus',
    apiKeyPrefix: 'sk-',
    description: '阿里云通义千问，中文理解能力强',
  },
  {
    id: 'moonshot',
    name: 'Moonshot (月之暗面)',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K', maxTokens: 8192 },
      { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K', maxTokens: 32768 },
      { id: 'moonshot-v1-128k', name: 'Moonshot V1 128K', maxTokens: 131072 },
    ],
    defaultModel: 'moonshot-v1-8k',
    apiKeyPrefix: 'sk-',
    description: 'Kimi 大模型，长上下文支持优秀',
  },
  {
    id: 'glm',
    name: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4 Plus', maxTokens: 16384 },
      { id: 'glm-4-flash', name: 'GLM-4 Flash', maxTokens: 8192 },
      { id: 'glm-4-long', name: 'GLM-4 Long', maxTokens: 131072 },
      { id: 'glm-4-air', name: 'GLM-4 Air', maxTokens: 8192 },
    ],
    defaultModel: 'glm-4-flash',
    apiKeyPrefix: '',
    description: '智谱 AI GLM 系列，国内优质模型',
  },
  {
    id: 'doubao',
    name: '豆包 (字节跳动)',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [
      { id: 'doubao-pro-4k', name: '豆包 Pro 4K', maxTokens: 4096 },
      { id: 'doubao-pro-32k', name: '豆包 Pro 32K', maxTokens: 32768 },
      { id: 'doubao-pro-128k', name: '豆包 Pro 128K', maxTokens: 131072 },
      { id: 'doubao-lite-4k', name: '豆包 Lite 4K', maxTokens: 4096 },
    ],
    defaultModel: 'doubao-pro-32k',
    apiKeyPrefix: '',
    description: '字节跳动豆包大模型，性价比高',
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', maxTokens: 8192 },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', maxTokens: 8192 },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', maxTokens: 8192 },
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct', name: 'Llama 3.1 405B', maxTokens: 8192 },
    ],
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    apiKeyPrefix: 'sk-',
    description: 'SiliconFlow 硅基流动，国内优质推理平台',
  },
  {
    id: 'custom',
    name: '自定义 (OpenAI兼容)',
    baseUrl: '',
    models: [],
    defaultModel: '',
    apiKeyPrefix: '',
    description: '自定义 OpenAI 兼容 API 地址，支持任何兼容服务',
  },
  {
    id: 'builtin',
    name: '内置模型 (z-ai)',
    baseUrl: '',
    models: [
      { id: 'default', name: '默认模型', maxTokens: 4096 },
    ],
    defaultModel: 'default',
    apiKeyPrefix: '',
    description: '平台内置 AI 模型，无需配置即可使用',
  },
];

// ---- Get Provider Config ----

export function getProviderConfig(providerId: string): ProviderConfig | undefined {
  return AI_PROVIDERS.find((p) => p.id === providerId);
}

export function getProviderModels(providerId: string) {
  const provider = getProviderConfig(providerId);
  return provider?.models || [];
}

// ---- AI Settings Helper ----

export interface AISettingsConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export async function getAISettings(): Promise<AISettingsConfig> {
  try {
    const settings = await db.aISettings.findFirst();
    if (settings) {
      return {
        provider: settings.provider || 'nvidia',
        apiKey: settings.apiKey || '',
        baseUrl: settings.baseUrl || 'https://integrate.api.nvidia.com/v1',
        model: settings.model || 'deepseek-ai/deepseek-r1',
        temperature: settings.temperature ?? 0.7,
        maxTokens: settings.maxTokens || 8192,
      };
    }
  } catch (error) {
    console.warn('Failed to read AI settings from DB:', error);
  }

  // Default to NVIDIA
  return {
    provider: 'nvidia',
    apiKey: '',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    model: 'deepseek-ai/deepseek-r1',
    temperature: 0.7,
    maxTokens: 8192,
  };
}

// ---- OpenAI-Compatible API Client ----

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAICompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Non-streaming chat completion using OpenAI-compatible API
 */
async function openAIChat(
  config: AISettingsConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const body: OpenAICompletionRequest = {
    model: config.model,
    messages,
    temperature: options?.temperature ?? config.temperature,
    max_tokens: options?.maxTokens ?? config.maxTokens,
    stream: false,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Streaming chat completion using OpenAI-compatible API (SSE)
 */
async function openAIChatStream(
  config: AISettingsConfig,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<AsyncIterable<{ choices: Array<{ delta: { content?: string } }> }>> {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const body: OpenAICompletionRequest = {
    model: config.model,
    messages,
    temperature: options?.temperature ?? config.temperature,
    max_tokens: options?.maxTokens ?? config.maxTokens,
    stream: true,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`AI API streaming error (${response.status}): ${errorText}`);
  }

  // Parse SSE stream into async iterable
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body for streaming');

  const decoder = new TextDecoder();
  let buffer = '';

  async function* generateChunks() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              yield { choices: [{ delta: { content } }] };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  return generateChunks();
}

// ---- Built-in SDK Client ----

let zaiInstance: any = null;
let zaiInitError: string | null = null;

async function getZAI(): Promise<any> {
  if (zaiInitError) {
    throw new Error(`内置模型不可用: ${zaiInitError}`);
  }
  if (!zaiInstance) {
    try {
      const ZAIClass = await getZAIClass();
      zaiInstance = await ZAIClass.create();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      zaiInitError = msg;
      throw new Error(`内置模型初始化失败: ${msg}`);
    }
  }
  return zaiInstance;
}

async function builtinChat(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const zai = await getZAI();
  const result = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
    ...(options?.model && options.model !== 'default' && { model: options.model }),
    ...(options?.temperature !== undefined && { temperature: options.temperature }),
    ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
  });
  return result.choices[0]?.message?.content || '';
}

async function builtinChatStream(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
) {
  const zai = await getZAI();
  const stream = await zai.chat.completions.create({
    messages,
    stream: true,
    thinking: { type: 'disabled' },
    ...(options?.model && options.model !== 'default' && { model: options.model }),
    ...(options?.temperature !== undefined && { temperature: options.temperature }),
    ...(options?.maxTokens !== undefined && { max_tokens: options.maxTokens }),
  });
  return stream;
}

// ---- Unified AI Interface ----

/**
 * Non-streaming AI chat completion - automatically routes to the configured provider
 */
export async function aiChat(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const config = await getAISettings();

  if (config.provider === 'builtin') {
    return builtinChat(messages, options);
  }

  // For external providers, validate API key
  if (!config.apiKey) {
    throw new Error(`请先在设置中配置 ${getProviderConfig(config.provider)?.name || config.provider} 的 API 密钥`);
  }

  return openAIChat(config, messages, options);
}

/**
 * Streaming AI chat completion - automatically routes to the configured provider
 */
export async function aiChatStream(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; maxTokens?: number }
) {
  const config = await getAISettings();

  if (config.provider === 'builtin') {
    return builtinChatStream(messages, options);
  }

  // For external providers, validate API key
  if (!config.apiKey) {
    throw new Error(`请先在设置中配置 ${getProviderConfig(config.provider)?.name || config.provider} 的 API 密钥`);
  }

  return openAIChatStream(config, messages, options);
}

/**
 * Create a ReadableStream from the AI streaming response
 * for use in Next.js API routes with proper formatting
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

/**
 * Check if AI is properly configured
 */
export async function isAIConfigured(): Promise<{ configured: boolean; provider: string; error?: string }> {
  const config = await getAISettings();

  if (config.provider === 'builtin') {
    return { configured: true, provider: 'builtin' };
  }

  if (!config.apiKey) {
    const providerName = getProviderConfig(config.provider)?.name || config.provider;
    return { configured: false, provider: config.provider, error: `请先配置 ${providerName} 的 API 密钥` };
  }

  return { configured: true, provider: config.provider };
}
