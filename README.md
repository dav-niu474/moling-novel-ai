<div align="center">

# 墨灵 MoLing

### AI网文创作平台

[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000?logo=vercel&logoColor=white)](https://my-project-seven-xi-98.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## 📖 项目简介

**墨灵**是一款面向网文创作者的 AI Agent 平台，集成雪花写作法、角色弧光理论、世界观构建等专业创作方法论，帮助作者从灵感种子到完稿的全流程 AI 辅助创作。

无论你是在构思一本玄幻巨著，还是打磨一部都市力作，墨灵都能成为你最默契的创作搭档——提供从架构规划、角色塑造、世界观搭建、大纲编写到正文生成的完整创作链路支持。

---

## ✨ 核心特性

- 🏗️ **雪花写作法架构生成** — 从一句话核心种子逐步扩展为完整的小说架构
- 👤 **角色弧光设计** — 基于角色弧光理论，生成有深度的角色设定和成长轨迹
- 🌍 **世界观构建** — 多维度世界观设定（地理、文化、力量体系、历史、势力等）
- 📋 **智能大纲生成** — 章节级大纲规划，含关键情节点、伏笔、情感节奏、冲突设计
- ✍️ **流式正文写作** — 实时流式生成章节正文，支持上下文感知
- 🎯 **智能润色/扩写/去AI味** — 右键上下文菜单，一键润色、扩写、去AI味、强化冲突、增加细节
- 🔍 **一致性检查** — 自动检测角色行为、世界观规则、情节逻辑的一致性问题
- 📤 **多格式导出** — 支持 TXT / Markdown 格式导出
- 🎨 **水墨主题** — 温暖琥珀色调，水墨画风格，支持深色模式

---

## 🛠️ 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | [Next.js 16](https://nextjs.org) (App Router) + [TypeScript 5](https://www.typescriptlang.org) |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| 数据库 | [Prisma ORM](https://www.prisma.io) + [PostgreSQL](https://www.postgresql.org) (Vercel Postgres) |
| 状态管理 | [Zustand](https://zustand.docs.pmnd.rs) + [TanStack Query](https://tanstack.com/query) |
| AI 能力 | 多模型供应商支持 (NVIDIA NIM / OpenAI / DeepSeek / 通义千问 / Moonshot / 智谱GLM / 豆包 / SiliconFlow / 自定义 / 内置) |
| 动画 | [Framer Motion](https://www.framer.com/motion) |

---

## 📁 项目结构

```
moling-novel-ai/
├── prisma/                    # 数据库 Schema
│   └── schema.prisma          # Prisma 数据模型定义
├── src/
│   ├── app/                   # Next.js App Router 页面和 API
│   │   ├── page.tsx           # 首页
│   │   ├── layout.tsx         # 根布局
│   │   ├── globals.css        # 全局样式
│   │   └── api/               # 后端 API 路由
│   │       ├── projects/      # 项目相关接口
│   │       ├── characters/    # 角色相关接口
│   │       ├── world-settings/      # 世界观相关接口
│   │       ├── chapter-outlines/    # 章节大纲接口
│   │       ├── chapter-contents/    # 章节内容接口
│   │       ├── settings/            # 应用设置接口
│   │       └── ai-settings/         # AI 设置接口
│   ├── components/            # React 组件
│   │   ├── novel/             # 网文创作相关组件
│   │   │   ├── ProjectList.tsx           # 项目列表
│   │   │   ├── CreateProjectDialog.tsx   # 创建项目弹窗
│   │   │   ├── ProjectWorkspace.tsx      # 项目工作台
│   │   │   ├── WorkspaceSidebar.tsx      # 工作台侧边栏
│   │   │   ├── ArchitecturePanel.tsx     # 架构面板
│   │   │   ├── CharactersPanel.tsx       # 角色面板
│   │   │   ├── WorldviewPanel.tsx        # 世界观面板
│   │   │   ├── OutlinePanel.tsx          # 大纲面板
│   │   │   ├── WritingPanel.tsx          # 写作面板
│   │   │   ├── RefinePanel.tsx           # 润色面板
│   │   │   ├── ExportPanel.tsx           # 导出面板
│   │   │   └── SettingsPanel.tsx         # 设置面板
│   │   └── ui/               # shadcn/ui 组件
│   ├── hooks/                 # 自定义 Hooks
│   └── lib/                   # 工具函数和配置
│       ├── ai.ts              # AI 模块入口 (re-export)
│       ├── ai-provider.ts     # 多模型供应商抽象层
│       ├── db.ts              # 数据库客户端
│       ├── prompts.ts         # 提示词模板
│       ├── store.ts           # Zustand 状态管理
│       └── utils.ts           # 通用工具函数
├── public/                    # 静态资源
│   ├── hero.png               # 首页头图
│   └── logo.svg               # Logo
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example               # 环境变量示例
```

---

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org) >= 18
- [Bun](https://bun.sh) (推荐) 或 npm / pnpm / yarn
- [PostgreSQL](https://www.postgresql.org) 数据库（本地或云端）

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/dav-niu474/moling-novel-ai.git
cd moling-novel-ai

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 设置 DATABASE_URL 和 AI API 密钥

# 4. 初始化数据库
bun run db:push

# 5. 启动开发服务器
bun run dev
```

启动后访问 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## ⚙️ 环境变量说明

| 变量名 | 说明 | 示例 |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 (连接池模式) | `postgresql://user:password@host/db?sslmode=require` |
| `DIRECT_URL` | PostgreSQL 直连 URL (用于 Prisma 迁移) | `postgresql://user:password@host/db?sslmode=require` |

> 💡 **提示**：AI 相关的 API 密钥和模型配置在应用内的 **设置面板** 中管理，无需在环境变量中配置。支持 10 种模型供应商，默认使用 NVIDIA NIM (免费)。

---

## 📡 API 路由

### 项目管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/projects` | 获取项目列表 |
| `POST` | `/api/projects` | 创建新项目 |
| `GET` | `/api/projects/[id]` | 获取项目详情 |
| `PUT` | `/api/projects/[id]` | 更新项目 |
| `DELETE` | `/api/projects/[id]` | 删除项目 |
| `POST` | `/api/projects/[id]/architecture` | 生成架构 |
| `POST` | `/api/projects/[id]/outline` | 生成大纲 |
| `POST` | `/api/projects/[id]/chapters` | 生成章节（流式） |
| `POST` | `/api/projects/[id]/refine` | 文本润色 |
| `POST` | `/api/projects/[id]/check` | 一致性检查 |
| `GET` | `/api/projects/[id]/export` | 导出项目 |

### 角色管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/characters` | 获取角色列表 |
| `POST` | `/api/characters` | 创建角色 |
| `POST` | `/api/characters/generate` | AI 生成角色 |

### 世界观设定

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/world-settings` | 获取世界观列表 |
| `POST` | `/api/world-settings` | 创建世界观设定 |
| `POST` | `/api/world-settings/generate` | AI 生成世界观 |

### 章节大纲

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/chapter-outlines` | 获取大纲列表 |
| `POST` | `/api/chapter-outlines` | 创建大纲 |
| `POST` | `/api/chapter-outlines/generate` | AI 生成大纲 |

### 章节内容

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/chapter-contents` | 获取章节内容列表 |
| `POST` | `/api/chapter-contents` | 创建章节内容 |
| `POST` | `/api/chapter-contents/generate` | AI 生成正文（流式） |
| `POST` | `/api/chapter-contents/refine` | AI 润色文本 |

### AI 设置

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/ai-settings` | 获取 AI 设置 (含供应商列表) |
| `PUT` | `/api/ai-settings` | 更新 AI 设置 |
| `GET` | `/api/settings` | 获取应用设置 (API Key 脱敏) |
| `PUT` | `/api/settings` | 更新应用设置 |

### 支持的 AI 供应商

| 供应商 | 说明 | 免费使用 |
| --- | --- | --- |
| 🟢 NVIDIA NIM | 免费提供 DeepSeek R1、Llama 等开源大模型 | ✅ |
| 🔵 OpenAI | GPT-4o、GPT-4o Mini 等 | ❌ |
| 🔵 DeepSeek | DeepSeek Chat (V3)、DeepSeek Reasoner (R1) | ❌ |
| 🔵 通义千问 | Qwen Turbo / Plus / Max / Long | ❌ |
| 🔵 Moonshot | Kimi 大模型，长上下文支持 | ❌ |
| 🔵 智谱 GLM | GLM-4 Plus / Flash / Long / Air | ❌ |
| 🔵 豆包 | 字节跳动大模型，性价比高 | ❌ |
| 🔵 SiliconFlow | 硅基流动，国内推理平台 | 部分 |
| ⚙️ 自定义 | 任何 OpenAI 兼容 API (OneAPI/New API 等) | - |
| 🆓 内置模型 | 平台内置 AI，无需配置 | ✅ |

---

## 🌐 部署

### Vercel 一键部署（推荐）

1. 将项目推送到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 中导入该仓库
3. 配置环境变量 `DATABASE_URL`（使用 Vercel Postgres 或其他 PostgreSQL 数据库）
4. 点击 **Deploy** 完成部署

### 其他平台

墨灵基于 Next.js 构建，支持所有兼容 Next.js 的部署平台，包括但不限于：

- [Railway](https://railway.app)
- [Render](https://render.com)
- 自托管服务器（使用 `bun run build && bun start`）

---

## 📄 License

[MIT](./LICENSE)

---

<div align="center">

**墨灵** — 让灵感，落笔成章 ✨

</div>
