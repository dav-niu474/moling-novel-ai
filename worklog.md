---
Task ID: 1
Agent: main
Task: Implement multi-provider AI system for MoLing novel platform

Work Log:
- Explored entire project structure: 18 API routes, 10 components, 5 lib files
- Identified core issue: AI settings stored in DB but never passed to AI calls
- Identified that all AI calls used z-ai-web-dev-sdk defaults with no provider configuration
- Designed multi-provider architecture supporting 10 providers (NVIDIA, OpenAI, DeepSeek, Qwen, Moonshot, GLM, Doubao, SiliconFlow, Custom, Built-in)
- Updated Prisma schema: added `provider` field, changed default model/baseUrl to NVIDIA
- Created `src/lib/ai-provider.ts`: complete multi-provider abstraction layer with:
  - Provider configuration registry (10 providers with model lists)
  - OpenAI-compatible API client (supports all providers via fetch)
  - Streaming SSE parser for real-time text generation
  - Built-in z-ai-web-dev-sdk as fallback option
  - Lazy import of z-ai-web-dev-sdk to prevent module-level crashes
  - Unified aiChat() and aiChatStream() that auto-route to configured provider
  - Settings management with DB integration
- Updated `src/lib/ai.ts`: re-exports from ai-provider.ts
- Updated `/api/ai-settings` route: supports multi-provider, auto-fills base URL/model on provider switch, API key masking
- Updated `/api/settings` route: same multi-provider support
- Updated `SettingsPanel.tsx`: completely redesigned UI with:
  - Provider selection dropdown with badges (推荐/免配置)
  - Dynamic model list per provider
  - API key input with provider-specific hints
  - Base URL auto-fill (editable only for Custom provider)
  - Connection test button
  - Quick setup guide with provider links
- All existing API routes (architecture, outline, characters, world-settings, chapter generation, refine, consistency check) now automatically use the configured provider via the updated aiChat()/aiChatStream() functions
- Set default NVIDIA API key in database

Stage Summary:
- Multi-provider AI system fully implemented and tested
- NVIDIA API confirmed working: refine returns "少年独立于山巅，目光遥望着远方那一片绵延的云海"
- POST /api/chapter-contents/refine 200 in 1542ms with NVIDIA Llama 3.3 70B
- All 10 providers configured: NVIDIA (default), OpenAI, DeepSeek, Qwen, Moonshot, GLM, Doubao, SiliconFlow, Custom, Built-in
- Settings UI completely redesigned for multi-provider support
