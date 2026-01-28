# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI chatbot application built with Next.js 16, AI SDK 6, and the Vercel AI Gateway. Uses Drizzle ORM with PostgreSQL for persistence and Auth.js for authentication.

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
├── (auth)/           # Auth route group - login, register, auth config
│   ├── auth.ts       # NextAuth configuration with credentials providers
│   └── api/          # Auth API routes
├── (chat)/           # Chat route group - main chat functionality
│   ├── api/chat/     # Chat streaming API (POST for messages, DELETE for chats)
│   └── chat/[id]/    # Dynamic chat routes
└── layout.tsx        # Root layout with providers (Theme, Session, Toaster)
```

### Key Directories

- **components/**: UI components organized by feature
  - `ai-elements/`: AI-specific components (prompt-input, reasoning, chain-of-thought, etc.)
  - `ui/`: shadcn/ui primitives
  - Root level: Feature components (chat, message, artifact, sidebar, etc.)
- **lib/**: Core utilities and business logic
  - `ai/`: AI SDK configuration, model providers, system prompts, tools
  - `db/`: Drizzle schema, queries, migrations
- **hooks/**: Custom React hooks (use-artifact, use-auto-resume, use-chat-visibility, etc.)
- **artifacts/**: Document artifact types (code, text, image, sheet)

### AI Integration

Uses Vercel AI Gateway (`@ai-sdk/gateway`) for multi-provider LLM access:
- Default model: `google/gemini-2.5-flash-lite`
- Reasoning models: Detected by `reasoning` or `thinking` suffix, wrapped with reasoning middleware
- Provider configuration in `lib/ai/providers.ts`

Built-in tools in `lib/ai/tools/`:
- `createDocument` / `updateDocument`: Artifact creation and editing
- `getWeather`: Weather information
- `requestSuggestions`: Document suggestions

### Database Schema

Drizzle ORM with PostgreSQL. Schema in `lib/db/schema.ts`:
- `User`, `Chat`, `Message_v2` (current), `Vote_v2`, `Document`, `Suggestion`, `Stream`
- Message_v2 uses `parts` and `attachments` JSON fields (deprecates old `Message` table)

### Authentication

NextAuth 5 beta with two credential providers:
- Regular auth: Email/password
- Guest auth: Auto-created guest users
- User types tracked in session: `guest` | `regular`

### Testing

Playwright for e2e testing. Mock models in `lib/ai/models.mock.ts` activated when `PLAYWRIGHT` env var is set. Tests in `tests/e2e/`.

## Environment Variables

Required (see `.env.example`):
- `AUTH_SECRET`: NextAuth secret
- `AI_GATEWAY_API_KEY`: For non-Vercel deployments
- `POSTGRES_URL`: Database connection
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage
- `REDIS_URL`: Optional, for resumable streams

## Code Style

Uses Ultracite (Biome-based) linter/formatter:
- 2-space indentation
- Strict TypeScript with `strictNullChecks`
- Path alias: `@/*` maps to project root
- Excluded from linting: `components/ui`, `lib/utils.ts`, `hooks/use-mobile.ts`
