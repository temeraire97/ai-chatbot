# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Resume chatbot application built with Next.js 16, AI SDK 6, and Anthropic Claude. Uses Drizzle ORM with PostgreSQL for persistence and RAG (Retrieval-Augmented Generation) with Milvus vector database for resume-based Q&A.

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server with Turbo (localhost:3000)
pnpm lint             # Check code with Ultracite (Biome-based)
pnpm format           # Fix lint/format issues
pnpm test             # Run Playwright e2e tests
```

### Database Commands

```bash
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate migration from schema changes
pnpm db:studio        # Open Drizzle Studio
pnpm db:push          # Push schema directly (dev only)
```

### Running a Single Test

```bash
pnpm exec playwright test tests/e2e/chat.test.ts
pnpm exec playwright test -g "can type in the input field"  # By test name
```

## Architecture

### App Router Structure

```
app/
├── (chat)/           # Chat route group - main chat functionality
│   ├── api/chat/     # Chat streaming API (POST for messages, DELETE for chats)
│   ├── api/history/  # Chat history API
│   └── chat/[id]/    # Dynamic chat routes
└── layout.tsx        # Root layout with providers (Theme, Toaster)
```

### Key Directories

- **components/**: UI components organized by feature
  - `ai-elements/`: AI-specific components (prompt-input, reasoning, etc.)
  - `ui/`: shadcn/ui primitives
- **lib/**: Core utilities and business logic
  - `ai/`: AI SDK configuration - providers.ts exports `getLanguageModel()` and `getTitleModel()`
  - `db/`: Drizzle schema, queries, migrations
  - `rag/`: RAG retrieval logic for resume context
- **hooks/**: Custom React hooks

### AI Integration

Uses Anthropic Claude directly (not Vercel AI Gateway):
- Model: `claude-3-5-haiku-20241022` for both chat and title generation
- Provider configuration in `lib/ai/providers.ts`
- RAG-based responses using `lib/rag/retriever.ts` to fetch resume context
- System prompts in `lib/ai/prompts.ts`

### RAG Pipeline

1. User message received in `/api/chat/route.ts`
2. `retrieveResumeContext()` queries Milvus vector DB for relevant resume sections
3. Context injected into system prompt via `getResumeSystemPrompt(context)`
4. Claude generates response based on retrieved resume data

### Database Schema

Drizzle ORM with PostgreSQL. Schema in `lib/db/schema.ts`:
- `Chat`: id, title, visitorId (visitor identification), visibility
- `Message_v2`: id, chatId, role, parts (JSON), attachments (JSON)
- `Vote_v2`: chatId, messageId, isUpvoted
- `Stream`: id, chatId for resumable streams

No user authentication - uses anonymous `visitorId` for session tracking.

### Testing

Playwright for e2e testing. Mock models in `lib/ai/models.mock.ts` activated when `PLAYWRIGHT` env var is set. Tests in `tests/e2e/`.

## Environment Variables

Required (see `.env.example`):
- `ANTHROPIC_API_KEY`: Claude API key
- `POSTGRES_URL`: Database connection
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage
- `REDIS_URL`: Optional, for resumable streams
- Milvus connection vars for RAG

## Code Style

Uses Ultracite (Biome-based) linter/formatter:
- 2-space indentation
- Strict TypeScript with `strictNullChecks`
- Path alias: `@/*` maps to project root
- Key rules: no `var`, use `for...of`, arrow functions preferred, no TypeScript enums
- Excluded from linting: `components/ui`, `lib/utils.ts`, `hooks/use-mobile.ts`
