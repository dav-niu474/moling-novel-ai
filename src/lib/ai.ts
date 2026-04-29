// ============================================================
// 墨灵 (MoLing) - AI Module
// Re-exports from the multi-provider AI abstraction layer
// All AI functionality is now in ai-provider.ts
// ============================================================

export {
  aiChat,
  aiChatStream,
  aiChatStreamCollect,
  createStreamingResponse,
  parseAIJSON,
  isAIConfigured,
  getAISettings,
  getProviderConfig,
  getProviderModels,
  AI_PROVIDERS,
} from './ai-provider';

export type { AISettingsConfig, ProviderConfig } from './ai-provider';

// Re-export database utilities
export { ensureDbInitialized } from './db';
