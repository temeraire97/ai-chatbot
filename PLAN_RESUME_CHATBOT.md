# Resume 챗봇 변환 프로젝트 계획

## 1. 프로젝트 개요

### 목표
현재 범용 AI 챗봇을 **윤현수 이력서 기반 RAG 챗봇**으로 변환

### 확정된 요구사항
- RAG 방식 (Zilliz Free tier)
- PostgreSQL 유지 (Neon Free tier) - 채팅 히스토리
- 인증 제거 (익명 사용)
- Anthropic API 직접 사용 (Claude Haiku 고정)
- OpenAI API로 임베딩 (text-embedding-3-small)

---

## 2. 아키텍처 설계

### 최종 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                    │
│                      Vercel 배포                             │
└──────────────┬──────────────────┬──────────────────┬────────┘
               │                  │                  │
               ▼                  ▼                  ▼
        ┌──────────┐       ┌──────────┐       ┌──────────┐
        │  Zilliz  │       │   Neon   │       │Anthropic │
        │  (RAG)   │       │(History) │       │  (LLM)   │
        │  Free    │       │  Free    │       │  Haiku   │
        └──────────┘       └──────────┘       └──────────┘
              │
              ▼
        ┌──────────┐
        │  OpenAI  │
        │(Embedding)│
        └──────────┘
```

### 데이터 흐름

```
1. 사용자 질문 입력
       ↓
2. OpenAI 임베딩 생성 (text-embedding-3-small, 1536차원)
       ↓
3. Zilliz 벡터 검색 (top-k=3, 관련 Resume 섹션)
       ↓
4. System Prompt + 검색 결과 컨텍스트 조합
       ↓
5. Claude Haiku로 답변 생성 (스트리밍)
       ↓
6. Neon DB에 대화 히스토리 저장
```

### 환경 변수

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...      # LLM (Claude Haiku)
OPENAI_API_KEY=sk-...             # 임베딩 (질문 + 시딩)
ZILLIZ_ENDPOINT=https://...       # 벡터 DB
ZILLIZ_API_KEY=...
POSTGRES_URL=postgresql://...      # 채팅 히스토리
# AUTH_SECRET 제거 (인증 없음)
```

### 필수 의존성 변경

```json
// package.json
{
  "dependencies": {
    // 추가
    "@ai-sdk/anthropic": "latest",
    "@ai-sdk/openai": "latest",
    "@zilliz/milvus2-sdk-node": "latest"
  },
  "devDependencies": {
    // 제거 가능
    // "next-auth": "5.0.0-beta.25",
    // "bcrypt-ts": "5.0.2"
  }
}
```

### Rate Limiting 설계

```typescript
// lib/rateLimit.ts
interface RateLimitConfig {
  windowMs: number;        // 1분
  maxRequests: number;     // IP당 20회
  visitorBonus: number;    // visitorId 있으면 +10회
}

// 구현 방식: Vercel Edge Config 또는 Upstash Redis
// IP + visitorId 조합으로 레이트 리밋 키 생성
// 초과 시 429 응답 + Retry-After 헤더
```

### Fallback 조건 명세

| 시나리오 | 감지 조건 | Fallback 동작 |
|---------|----------|--------------|
| Zilliz 연결 실패 | Connection timeout 3s | 전체 Resume context (~3K tokens) 주입 |
| Zilliz 검색 실패 | Search error/empty | Top 5 청크 (intro + skills) 주입 |
| 임베딩 생성 실패 | OpenAI API error | 키워드 매칭 기반 검색 |
| Claude API 실패 | Anthropic API error | 에러 메시지 표시 + 재시도 버튼 |
| DB 저장 실패 | PostgreSQL error | 클라이언트 로컬 저장 + 재시도 큐 |

### 임베딩 캐싱 전략

```typescript
// lib/rag/embeddings.ts
// 캐싱 계층:
// 1. 메모리 캐시 (LRU, 100개 쿼리)
// 2. 정규화된 질문 해싱 (동일 의미 질문 캐시 히트)

const embeddingCache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 100;

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim()
    .replace(/[?!。？！]/g, '')
    .replace(/\s+/g, ' ');
}

async function getEmbedding(query: string): Promise<number[]> {
  const normalized = normalizeQuery(query);
  const cacheKey = hashString(normalized);

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const embedding = await openai.embeddings.create(...);

  // LRU 캐시 관리
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    embeddingCache.delete(firstKey);
  }
  embeddingCache.set(cacheKey, embedding);

  return embedding;
}
```

---

## 3. 제거할 기능/파일 목록

### 3.1 인증 시스템 (완전 제거)

```
app/(auth)/                          # 전체 삭제
├── auth.ts                          # NextAuth 설정
├── auth.config.ts                   # NextAuth 기본 설정
├── actions.ts                       # login/register 액션
├── api/auth/[...nextauth]/route.ts  # NextAuth API
├── api/auth/guest/route.ts          # 게스트 로그인
├── login/page.tsx                   # 로그인 페이지
└── register/page.tsx                # 회원가입 페이지

components/
├── auth-form.tsx                    # 삭제
├── sign-out-form.tsx                # 삭제
└── sidebar-user-nav.tsx             # 간소화 (테마 토글만 유지)

# 추가 제거 대상 (Architect 검증)
proxy.ts                             # next-auth/jwt import 포함
lib/ai/entitlements.ts               # UserType 기반 권한 체계
```

### 3.2 Artifact 시스템 (완전 제거)

```
artifacts/                           # 전체 삭제
├── actions.ts
├── code/
├── image/
├── sheet/
└── text/

lib/artifacts/                       # 전체 삭제 (server.ts 포함)

components/
├── artifact.tsx                     # 삭제
├── artifact-actions.tsx             # 삭제
├── artifact-close-button.tsx        # 삭제
├── artifact-messages.tsx            # 삭제
├── create-artifact.tsx              # 삭제
├── document.tsx                     # 삭제
├── document-preview.tsx             # 삭제
├── document-skeleton.tsx            # 삭제
└── ai-elements/artifact.tsx         # 삭제
```

### 3.3 AI 도구 (완전 제거)

```
lib/ai/tools/                        # 전체 삭제
├── create-document.ts
├── get-weather.ts
├── request-suggestions.ts
└── update-document.ts
```

### 3.4 불필요한 컴포넌트

```
components/
├── weather.tsx                      # 삭제
├── ai-elements/model-selector.tsx   # 삭제 (모델 고정)
├── suggestion.tsx                   # 삭제
├── diffview.tsx                     # 삭제
├── code-editor.tsx                  # 삭제 (artifact 관련)
├── sheet-editor.tsx                 # 삭제
├── text-editor.tsx                  # 삭제
└── image-editor.tsx                 # 삭제
```

### 3.5 불필요한 API 라우트

```
app/(chat)/api/
├── document/route.ts                # 삭제
├── suggestions/route.ts             # 삭제
├── vote/route.ts                    # 삭제
├── files/upload/route.ts            # 삭제
└── chat/[id]/stream/route.ts        # 삭제 (Redis 재개 기능 - 선택)
```

### 3.6 DB 스키마 제거 대상

```
lib/db/schema.ts에서 제거:
- user 테이블                        # 삭제
- document 테이블                    # 삭제
- suggestion 테이블                  # 삭제
- vote 테이블 (v1, v2)               # 삭제
- messageDeprecated 테이블           # 삭제
- voteDeprecated 테이블              # 삭제
```

### 3.7 추가 제거 대상 (Architect 검증)

```
app/(chat)/layout.tsx                # Pyodide 스크립트 제거 (~10MB 절약)
app/layout.tsx                       # SessionProvider 제거
tests/e2e/auth.test.ts               # 인증 테스트 삭제
tests/e2e/model-selector.test.ts     # 모델 선택 테스트 삭제
```

### 3.8 Hooks 및 쿼리 함수 제거 (누락된 항목)

```
hooks/
├── use-artifact.ts                  # 삭제 (useArtifact + useArtifactSelector 포함)
└── (use-artifact-selector.ts는 별도 파일 아님 - use-artifact.ts에서 export)

components/ (추가 확인 필요)
├── console.tsx                      # 삭제 (useArtifactSelector 의존)
├── toolbar.tsx                      # 삭제 (ArtifactKind, artifactDefinitions 의존)
├── ai-elements/toolbar.tsx          # 유지 (@xyflow/react 의존 - Artifact와 무관)
├── version-footer.tsx               # 수정 (useArtifact 제거)
└── data-stream-handler.tsx          # 수정 (useArtifact 제거)

lib/db/queries.ts에서 제거:
- getUser()                          # 삭제 (인증 제거, 함수명 정정)
- createUser()                       # 삭제
- createGuestUser()                  # 삭제 (게스트 인증)
- getUserByEmail()                   # 삭제
- saveDocument()                     # 삭제 (Artifact 시스템)
- getDocumentsById()                 # 삭제
- getDocumentById()                  # 삭제
- deleteDocumentsById()              # 삭제 (복수형 - 실제 함수명)
- deleteDocumentsByIdAfterTimestamp() # 삭제 (Artifact 시스템)
- saveSuggestions()                  # 삭제
- getSuggestionsByDocumentId()       # 삭제
- getVotesByChatId()                 # 삭제
- voteMessage()                      # 삭제
- deleteAllChatsByUserId()           # 수정 → deleteAllChatsByVisitorId()
- getMessageCountByUserId()          # 삭제 (entitlements 관련)
```

### 3.9 수정 필요 API 라우트 (삭제가 아닌 수정)

```
app/(chat)/api/history/route.ts      # 수정 (deleteAllChatsByVisitorId, auth 제거)
app/(chat)/actions.ts                # 수정 (generateTitleFromUserMessage - auth 제거)
```

### 3.10 Middleware 전략

```
proxy.ts 제거 시 고려사항:
- proxy.ts가 실제 미들웨어 구현체임 (middleware.ts는 존재하지 않음)
- proxy.ts는 next-auth/jwt 기반 미들웨어 로직 포함
- 인증 제거 후 proxy.ts 삭제 → 별도 middleware 불필요
- Rate limiting은 API route에서 직접 처리 (lib/rateLimit.ts)
```

### 3.11 테스트 인프라 수정

```
tests/
├── fixtures.ts                      # 수정 (auth mocking 제거)
├── helpers.ts                       # 수정:
│   ├── generateRandomTestUser()     # 삭제 (인증 제거)
│   └── 추가: generateRandomVisitorId()  # 신규 추가
└── pages/chat.ts                    # 수정:
    ├── artifact 셀렉터 제거
    ├── openModelSelector()          # 삭제 (모델 고정)
    ├── selectModel()                # 삭제
    └── searchModels()               # 삭제
```

---

## 4. 추가/수정할 기능 목록

### 4.1 새로 추가할 파일

```
lib/
├── rag/
│   ├── embeddings.ts               # OpenAI 임베딩 생성 + 캐싱
│   ├── vectorStore.ts              # Zilliz 클라이언트
│   └── retriever.ts                # RAG 검색 로직 + Fallback
├── resume/
│   └── chunks.ts                   # Resume 청크 데이터
├── visitor.ts                      # visitorId 관리 유틸
├── rateLimit.ts                    # Rate limiting 로직

scripts/
└── seed-vectors.ts                 # Resume 임베딩 업로드 스크립트
```

### 4.2 수정할 파일

#### lib/ai/prompts.ts
```typescript
// 변경 전: regularPrompt (범용)
// 변경 후: resumePrompt (이력서 특화)

export const resumeSystemPrompt = `당신은 윤현수의 이력서를 기반으로 답변하는 AI 어시스턴트입니다.

## 역할
- 윤현수의 경력, 기술 스택, 프로젝트 경험에 대해 정확하게 답변
- 한국어로 친절하고 전문적으로 응대
- 이력서에 없는 정보는 "해당 정보는 이력서에 포함되어 있지 않습니다"로 답변

## 컨텍스트
다음은 질문과 관련된 이력서 섹션입니다:
{context}

## 지침
1. 위 컨텍스트를 기반으로 정확하게 답변하세요
2. 컨텍스트에 없는 내용은 추측하지 마세요
3. 기술적 질문에는 구체적인 수치와 예시를 포함하세요
`;
```

#### lib/ai/providers.ts
```typescript
// 변경 전: Vercel AI Gateway
// 변경 후: Anthropic 직접 사용

import { anthropic } from '@ai-sdk/anthropic';

export function getLanguageModel() {
  return anthropic('claude-3-5-haiku-20241022');
}

// 제목 생성도 Haiku로 통일
export function getTitleModel() {
  return anthropic('claude-3-5-haiku-20241022');
}
```

#### lib/ai/models.ts
```typescript
// 변경 전: 다중 모델 지원
// 변경 후: 단일 모델 고정

export const DEFAULT_CHAT_MODEL = 'claude-3-5-haiku-20241022';

export const chatModels = [
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude Haiku',
    provider: 'anthropic',
    description: 'Fast and efficient for resume Q&A',
  },
];
```

#### lib/db/schema.ts
```typescript
// 변경: userId → visitorId (nullable)

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  visitorId: varchar("visitorId", { length: 36 }),  // nullable, 익명
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("public"),
});

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export const stream = pgTable("Stream", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chatId").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});
```

#### app/(chat)/api/chat/route.ts
```typescript
// 주요 변경사항:
// 1. auth() 제거 → visitorId 기반
// 2. 도구 호출 제거
// 3. RAG 검색 추가
// 4. 모델 고정
// 5. entitlements 제거
// 6. Rate limiting 추가

export async function POST(request: Request) {
  // Rate limiting 체크
  const rateLimitResult = await checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': rateLimitResult.retryAfter }
    });
  }

  const { id, message, visitorId } = await request.json();

  // RAG 검색 (with fallback)
  const context = await retrieveResumeContext(message.parts[0].text);

  // Claude Haiku 호출 (도구 없음)
  const result = streamText({
    model: getLanguageModel(),
    system: resumeSystemPrompt.replace('{context}', context),
    messages: modelMessages,
    // experimental_activeTools 제거
    // tools 제거
  });

  // 메시지 저장 (visitorId 기반)
  await saveChat({ id, visitorId, title: "Resume Q&A" });
  // ...
}
```

#### components/chat.tsx
```typescript
// 주요 변경사항:
// 1. Artifact 관련 코드 제거
// 2. 모델 선택 제거
// 3. visitorId 기반 세션 관리
// 4. vote 관련 제거

export function Chat({ id, initialMessages, isReadonly }) {
  // 제거: useArtifactSelector, currentModelId, vote 관련
  // 추가: visitorId 관리 (localStorage)

  const [visitorId] = useState(() => {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem('visitorId');
    if (stored) return stored;
    const newId = crypto.randomUUID();
    localStorage.setItem('visitorId', newId);
    return newId;
  });

  // Artifact 컴포넌트 제거
  // ModelSelector 제거
}
```

#### app/layout.tsx
```typescript
// SessionProvider 제거

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider ...>
          <Toaster position="top-center" />
          {children}  {/* SessionProvider 래핑 제거 */}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### components/sidebar-history.tsx
```typescript
// User 타입 → visitorId 기반으로 변경
// getChatsByUserId → getChatsByVisitorId로 변경
```

#### components/app-sidebar.tsx
```typescript
// User 타입 제거
// 인증 관련 UI 제거
```

---

## 5. 구현 단계별 작업 목록

> **순서 변경 (Architect 권장)**: Phase 2와 Phase 3 순서 교체
> - 불필요 기능 먼저 제거하면 인증 제거 시 영향 범위 감소
> - 빌드가 깨진 상태로 작업하는 시간 최소화

### Phase 0: 사전 준비 (30분)

| # | 작업 | 파일 | 예상 시간 |
|---|------|------|----------|
| 0.1 | 현재 상태 Git 백업 (feature/resume-chatbot 브랜치) | - | 5분 |
| 0.2 | 환경 변수 템플릿 작성 (.env.example) | .env.example | 10분 |
| 0.3 | Zilliz 계정 생성 및 클러스터 설정 | - | 15분 |

### Phase 1: RAG 인프라 구축 (2시간)

| # | 작업 | 파일 | 예상 시간 |
|---|------|------|----------|
| 1.1 | 의존성 추가 (@ai-sdk/anthropic, @ai-sdk/openai, @zilliz/milvus2-sdk-node) | package.json | 10분 |
| 1.2 | Resume 청킹 전략 설계 | lib/resume/chunks.ts | 30분 |
| 1.3 | OpenAI 임베딩 클라이언트 구현 + 캐싱 | lib/rag/embeddings.ts | 25분 |
| 1.4 | Zilliz 클라이언트 구현 | lib/rag/vectorStore.ts | 30분 |
| 1.5 | RAG Retriever 구현 + Fallback 로직 | lib/rag/retriever.ts | 20분 |
| 1.6 | 벡터 시딩 스크립트 작성 및 실행 | scripts/seed-vectors.ts | 25분 |

### Phase 2: 불필요 기능 제거 (1시간 15분) ← 먼저 수행

| # | 작업 | 파일 | 예상 시간 |
|---|------|------|----------|
| 2.1 | artifacts/ 디렉토리 삭제 | - | 5분 |
| 2.2 | lib/ai/tools/ 삭제 | - | 5분 |
| 2.3 | lib/artifacts/ 삭제 | - | 2분 |
| 2.4 | Artifact 컴포넌트들 삭제 | components/ | 10분 |
| 2.5 | hooks/use-artifact*.ts 삭제 | hooks/ | 5분 |
| 2.6 | 불필요 API 라우트 삭제 | app/(chat)/api/ | 10분 |
| 2.7 | Pyodide 스크립트 제거 | app/(chat)/layout.tsx | 5분 |
| 2.8 | proxy.ts 제거 | - | 2분 |
| 2.9 | queries.ts에서 불필요 함수 제거 | lib/db/queries.ts | 10분 |
| 2.10 | import 정리 및 타입 에러 수정 | 전체 | 20분 |

### Phase 3: 인증 제거 (1시간 15분) ← 나중에 수행

| # | 작업 | 파일 | 예상 시간 |
|---|------|------|----------|
| 3.1 | app/(auth)/ 디렉토리 삭제 | - | 5분 |
| 3.2 | 인증 관련 컴포넌트 삭제 | components/ | 5분 |
| 3.3 | lib/ai/entitlements.ts 삭제 | - | 2분 |
| 3.4 | SessionProvider 제거 | app/layout.tsx | 5분 |
| 3.5 | visitorId 기반 세션 구현 | lib/visitor.ts | 15분 |
| 3.6a | DB 스키마 수정 준비 (백업 + 스냅샷) | - | 5분 |
| 3.6b | DB 스키마 수정 (userId → visitorId) | lib/db/schema.ts | 10분 |
| 3.6c | 데이터 마이그레이션 스크립트 작성 | scripts/migrate-data.ts | 15분 |
| 3.6d | DB 마이그레이션 생성 및 실행 | drizzle/ | 10분 |
| 3.7 | 쿼리 함수 수정 (userId → visitorId) | lib/db/queries.ts | 15분 |
| 3.8 | sidebar-history.tsx User 타입 제거 | components/ | 5분 |
| 3.9 | app-sidebar.tsx User 타입 제거 | components/ | 5분|

### Phase 4: Chat API RAG 통합 (1시간 45분)

| # | 작업 | 파일 | 예상 시간 |
|---|------|------|----------|
| 4.1 | Rate limiting 구현 | lib/rateLimit.ts | 20분 |
| 4.2 | Anthropic 프로바이더 설정 | lib/ai/providers.ts | 15분 |
| 4.3 | Resume 시스템 프롬프트 작성 | lib/ai/prompts.ts | 20분 |
| 4.4 | RAG 검색 통합 | lib/rag/retriever.ts | 15분 |
| 4.5 | Chat API 리팩토링 | app/(chat)/api/chat/route.ts | 30분 |
| 4.6 | Phase 완료 검증 (빌드 테스트) | - | 15분 |

### Phase 5: UI 간소화 (1시간)

| # | 작업 | 파일 | 예상 시간 |
|---|------|------|----------|
| 5.1 | Chat 컴포넌트 정리 | components/chat.tsx | 20분 |
| 5.2 | MultimodalInput 간소화 | components/multimodal-input.tsx | 15분 |
| 5.3 | Sidebar 간소화 | components/app-sidebar.tsx | 10분|
| 5.4 | 브랜딩/스타일 조정 | app/globals.css, 기타 | 15분 |

### Phase 6: 테스트 및 배포 (1시간 30분)

| # | 작업 | 파일 | 예상 시간 |
|---|------|------|----------|
| 6.1 | 단위 테스트 작성 (RAG, 임베딩) | tests/unit/ | 25분 |
| 6.2 | E2E 테스트 수정/삭제 | tests/e2e/ | 20분 |
| 6.3 | 로컬 통합 테스트 | - | 20분 |
| 6.4 | Vercel 환경변수 설정 | - | 10분 |
| 6.5 | 배포 및 검증 | - | 15분 |

---

## 6. 예상 리스크 및 대응 방안

### 6.1 기술적 리스크

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| Zilliz 연결 실패 | 높음 | Fallback으로 전체 Resume context 주입 |
| 임베딩 품질 저하 | 중간 | 청킹 전략 조정, chunk overlap 추가 |
| Claude Haiku 응답 품질 | 중간 | 프롬프트 엔지니어링으로 보완 |
| DB 마이그레이션 실패 | 높음 | 새 테이블 생성 후 점진적 마이그레이션 |
| visitorId 스푸핑 | 중간 | Rate limiting을 IP + visitorId 조합으로 강화 |
| 브라우저 localStorage 삭제 | 낮음 | 히스토리 손실 안내 UI 추가 |
| OpenAI API 키 노출 | 높음 | 서버 사이드에서만 임베딩 호출 확인 |

### 6.2 추가 기술 리스크 (Architect 권장)

| 리스크 | 영향도 | 감지 방법 | 대응 방안 |
|--------|--------|----------|----------|
| Context Overflow | 높음 | 토큰 수 > 4K | 청크 수 제한 (max 3), 청크 크기 축소 |
| Race Condition (동시 요청) | 중간 | 중복 chatId 생성 | DB 트랜잭션 + unique constraint |
| Data Migration 실패 | 높음 | 마이그레이션 에러 | 기존 테이블 유지, 새 테이블로 점진 이전 |
| Edge Runtime 호환성 | 중간 | Zilliz SDK 에러 | Node.js runtime 강제 지정 |
| API 보안 (무인증) | 높음 | 비정상 트래픽 | Rate limit + Honeypot 질문 감지 |

### 6.3 Edge Runtime 호환성 대응

```typescript
// app/(chat)/api/chat/route.ts
export const runtime = 'nodejs';  // Edge 대신 Node.js 강제

// Zilliz SDK는 Node.js 환경 필요
// Edge Runtime에서 실행 시 crypto, buffer 등 누락 에러 발생
```

### 6.4 비용 리스크

| 항목 | 예상 월 비용 | 한도 초과 대응 |
|------|-------------|---------------|
| Claude Haiku | ~$1 | Rate limiting 추가 |
| OpenAI 임베딩 | ~$0.02/1K queries | 캐싱 검토 (동일 질문) |
| Zilliz | $0 (Free, 100MB) | 벡터 수 모니터링 |
| Neon | $0 (Free, 0.5GB) | 스토리지 모니터링 |

> **임베딩 비용 참고**: text-embedding-3-small = $0.00002/1K tokens
> - 시딩: ~5K tokens = $0.0001 (1회성)
> - 질문당: ~50 tokens = $0.000001

### 6.5 롤백 계획

문제 발생 시:
1. Git revert로 이전 버전 복구
2. Vercel 이전 배포로 롤백
3. DB는 별도 백업 유지 (마이그레이션 전 스냅샷)

### 6.6 데이터 마이그레이션 전략

```typescript
// scripts/migrate-data.ts
// 기존 userId 기반 데이터를 visitorId로 마이그레이션

/*
현재 상태:
- Chat 테이블: userId (NOT NULL, FK to User)
- User 테이블: id, email 등

목표 상태:
- Chat 테이블: visitorId (nullable, 36자 varchar)
- User 테이블: 삭제

마이그레이션 순서:
1. Chat.visitorId 컬럼 추가 (nullable)
2. 기존 Chat.userId를 임의의 visitorId로 복사 (또는 null)
3. Chat.userId FK 제약 제거
4. Chat.userId 컬럼 삭제
5. User 테이블 삭제

주의: 기존 채팅 데이터가 있다면 삭제됨을 안내
      또는 userId를 visitorId처럼 사용하여 보존 가능
*/

export async function migrateData() {
  // 1. 백업 확인
  console.log('⚠️  기존 데이터가 있다면 백업을 확인하세요');

  // 2. 스키마 마이그레이션
  await db.execute(sql`
    ALTER TABLE "Chat" ADD COLUMN "visitorId" VARCHAR(36);
  `);

  // 3. 기존 데이터 마이그레이션 (선택)
  // 옵션 A: 모든 기존 채팅을 삭제
  // 옵션 B: userId를 visitorId로 복사 (동일 사용자는 같은 히스토리 유지)
  await db.execute(sql`
    UPDATE "Chat" SET "visitorId" = "userId"::varchar(36);
  `);

  // 4. userId 컬럼 제거
  await db.execute(sql`
    ALTER TABLE "Chat" DROP COLUMN "userId";
  `);

  // 5. User 테이블 삭제
  await db.execute(sql`DROP TABLE IF EXISTS "User" CASCADE;`);
}
```

**마이그레이션 옵션**:
- **옵션 A (Clean Start)**: 기존 채팅 데이터 삭제, 깨끗하게 시작
- **옵션 B (Data Preserve)**: userId를 visitorId로 복사, 기존 사용자는 동일 히스토리 유지 불가 (localStorage 없음)

권장: **옵션 A** - 개인 포트폴리오용이므로 기존 테스트 데이터 삭제

---

## 7. Resume 청킹 전략

### 섹션 기반 청킹

```typescript
const chunks: ResumeChunk[] = [
  { id: 'intro', title: '기본 정보 및 자기소개', section: 'intro', ... },
  { id: 'project-openmeta', title: '오픈메타시티 스왑 - WebSocket', section: 'project', ... },
  { id: 'project-openmeta-detail', title: '오픈메타시티 스왑 - 성과/기술', section: 'project', ... },
  { id: 'project-editup', title: 'EditUp - CMS Adapter', section: 'project', ... },
  { id: 'project-editup-detail', title: 'EditUp - 담당업무 상세', section: 'project', ... },
  { id: 'project-lg', title: 'LG ES Chatbot', section: 'project', ... },
  { id: 'project-shinsegae', title: '신세계 면세점 챗봇', section: 'project', ... },
  { id: 'skills-frontend', title: '기술 스택 - Frontend', section: 'skills', ... },
  { id: 'skills-backend', title: '기술 스택 - Backend/Infra', section: 'skills', ... },
  { id: 'core-websocket', title: '핵심 역량 - 실시간 통신', section: 'core', ... },
  { id: 'core-sdk', title: '핵심 역량 - SDK 설계', section: 'core', ... },
  { id: 'core-fullstack', title: '핵심 역량 - 풀스택', section: 'core', ... },
  { id: 'why-daangn', title: '왜 당근 채팅팀인가', section: 'motivation', ... },
];
```

### 청크 메타데이터

```typescript
interface ResumeChunk {
  id: string;
  title: string;
  content: string;
  section: 'intro' | 'project' | 'skills' | 'core' | 'motivation';
  keywords: string[];
  relatedChunks: string[];  // 연관 청크 ID (하이브리드 검색 지원)
}
```

### 청킹 가이드라인 (Architect 권장)

- **청크 크기**: 300-500 토큰 목표
- **긴 섹션**: 하위 청크로 분할 (예: project-editup, project-editup-detail)
- **오버랩**: relatedChunks로 연관 관계 표시
- **top-k 동적 조정**:
  - 일반 질문: top-k=2-3
  - "모든 프로젝트" 류 질문: top-k=5-6

### 임베딩 스토리지 계산

```
~15개 청크 x 1536차원 x 4 bytes = ~92KB
Zilliz Free tier 100MB → 충분한 여유
```

---

## 8. 테스트 계획

### 8.1 제거할 테스트

```
tests/e2e/auth.test.ts              # 인증 테스트 전체 삭제
tests/e2e/model-selector.test.ts    # 모델 선택 테스트 삭제
```

### 8.2 수정할 테스트

```
tests/e2e/chat.test.ts              # RAG 기반으로 수정
tests/e2e/api.test.ts               # visitorId 기반으로 수정
```

### 8.3 단위 테스트 (신규)

```typescript
// tests/unit/rag.test.ts
describe('RAG System', () => {
  describe('Embedding', () => {
    it('should generate embeddings for query', async () => {
      const embedding = await getEmbedding('윤현수의 경력');
      expect(embedding).toHaveLength(1536);
    });

    it('should cache repeated queries', async () => {
      await getEmbedding('test query');
      await getEmbedding('test query');
      expect(openaiCallCount).toBe(1);
    });

    it('should normalize similar queries', () => {
      const q1 = normalizeQuery('경력이 뭐야?');
      const q2 = normalizeQuery('경력이 뭐야');
      expect(q1).toBe(q2);
    });
  });

  describe('Retriever', () => {
    it('should retrieve relevant chunks', async () => {
      const results = await retrieveResumeContext('WebSocket 경험');
      expect(results).toContain('오픈메타시티');
    });

    it('should fallback when Zilliz fails', async () => {
      mockZillizError();
      const results = await retrieveResumeContext('test');
      expect(results).toBeTruthy(); // Fallback 동작
    });
  });
});

// tests/unit/visitor.test.ts
describe('Visitor Management', () => {
  it('should generate new visitorId', () => {
    const id = getVisitorId();
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
  });

  it('should persist visitorId in localStorage', () => {
    const id1 = getVisitorId();
    const id2 = getVisitorId();
    expect(id1).toBe(id2);
  });
});

// tests/unit/rateLimit.test.ts
describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const result = await checkRateLimit('127.0.0.1', 'visitor-1');
    expect(result.allowed).toBe(true);
  });

  it('should block after limit exceeded', async () => {
    for (let i = 0; i < 20; i++) {
      await checkRateLimit('127.0.0.1', 'visitor-1');
    }
    const result = await checkRateLimit('127.0.0.1', 'visitor-1');
    expect(result.allowed).toBe(false);
  });
});
```

### 8.4 통합 테스트

```typescript
// tests/integration/chat-flow.test.ts
describe('Chat Flow Integration', () => {
  it('should complete full chat flow', async () => {
    // 1. 질문 입력
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test-chat',
        message: { parts: [{ text: '윤현수의 기술 스택은?' }] },
        visitorId: 'test-visitor'
      })
    });

    // 2. 스트리밍 응답 확인
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('React'); // 이력서 기반 응답

    // 3. DB 저장 확인
    const chat = await getChatById('test-chat');
    expect(chat).toBeTruthy();
  });

  it('should handle Zilliz fallback', async () => {
    mockZillizConnectionError();
    const response = await fetch('/api/chat', { ... });
    expect(response.status).toBe(200); // Fallback 동작
  });
});
```

### 8.5 성능 테스트

```typescript
// tests/performance/response-time.test.ts
describe('Performance', () => {
  it('should start streaming within 2s', async () => {
    const start = Date.now();
    const response = await fetch('/api/chat', { ... });
    const reader = response.body.getReader();
    await reader.read(); // 첫 청크
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });

  it('should handle 10 concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() =>
      fetch('/api/chat', { ... })
    );
    const responses = await Promise.all(requests);
    const allSuccess = responses.every(r => r.status === 200 || r.status === 429);
    expect(allSuccess).toBe(true);
  });
});
```

### 8.6 E2E 테스트 (수정)

```typescript
// tests/e2e/resume-chat.test.ts
test.describe('Resume Chat', () => {
  test('should answer resume questions', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('multimodal-input').fill('윤현수의 경력은?');
    await page.getByTestId('send-button').click();

    // 응답 대기
    await expect(page.locator('[data-role="assistant"]')).toBeVisible({ timeout: 10000 });
    const response = await page.locator('[data-role="assistant"]').textContent();
    expect(response).toContain('오픈메타시티'); // 이력서 내용 확인
  });

  test('should persist chat history', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('multimodal-input').fill('테스트');
    await page.getByTestId('send-button').click();
    await page.waitForSelector('[data-role="assistant"]');

    // 새로고침 후 히스토리 확인
    await page.reload();
    await expect(page.locator('[data-testid="sidebar-history"]')).toContainText('테스트');
  });
});
```

---

## 9. 성공 기준

- [ ] Resume 관련 질문에 정확한 답변 (정확도 90%+)
- [ ] 응답 시간 2초 이내 (스트리밍 시작)
- [ ] 익명 사용자 채팅 히스토리 저장/조회
- [ ] 모바일 반응형 UI
- [ ] 월 비용 $5 미만
- [ ] Zilliz Fallback 정상 작동
- [ ] Rate limiting 정상 작동 (429 응답)
- [ ] 단위 테스트 커버리지 80%+
- [ ] E2E 테스트 전체 통과

---

## 10. Architect 검증 결과 반영 사항

| 항목 | 원본 | 보완 내용 |
|------|------|----------|
| 의존성 | 누락 | @ai-sdk/anthropic, @ai-sdk/openai, @zilliz/milvus2-sdk-node 추가 |
| 제거 파일 | 불완전 | proxy.ts, lib/ai/entitlements.ts, Pyodide 스크립트, hooks/use-artifact.ts, queries.ts 함수 등 추가 |
| 구현 순서 | 비효율 | Phase 2-3 순서 교체 (불필요 기능 먼저 제거) |
| 리스크 | 불완전 | Context Overflow, Race Condition, Data Migration, Edge Runtime, API Security 등 10개 이상 추가 |
| 청킹 전략 | 기본 | 크기 균형, 오버랩, 동적 top-k 가이드라인 추가 |
| 테스트 | 누락 | 단위 테스트, 통합 테스트, 성능 테스트 계획 전체 추가 |
| 임베딩 비용 | 오류 | 질문당 임베딩 비용 명시 (1회성 아님) |
| Rate Limiting | 누락 | 상세 설계 추가 (IP + visitorId 조합) |
| Fallback | 누락 | 시나리오별 Fallback 조건 명세 추가 |
| 캐싱 전략 | 누락 | 임베딩 캐싱 LRU 전략 추가 |
| DB Migration | 단일 | Phase 3.6을 4단계로 분리 (백업/수정/스크립트/실행) |
| Phase 검증 | 누락 | Phase 4.6 빌드 테스트 추가 |
| 사전 준비 | 누락 | Phase 0 추가 (Git 백업, 환경변수, Zilliz 설정) |
| 파일 참조 오류 | 수정 | use-artifact-selector.ts 별도 파일 아님 명시 |
| 추가 컴포넌트 | 누락 | console.tsx, version-footer.tsx, toolbar.tsx, data-stream-handler.tsx 추가 |
| 쿼리 함수 누락 | 수정 | createGuestUser, deleteAllChatsByUserId, getMessageCountByUserId 추가 |
| API 라우트 수정 | 누락 | history/route.ts, actions.ts 수정 목록 추가 (Section 3.9) |
| Middleware 전략 | 누락 | proxy.ts 제거 시 middleware 처리 방안 추가 (Section 3.10) |
| 테스트 인프라 | 누락 | fixtures.ts, helpers.ts, pages/chat.ts 수정 목록 추가 (Section 3.11) |
| 데이터 마이그레이션 | 누락 | userId→visitorId 마이그레이션 스크립트 상세 추가 (Section 6.6) |

---

*작성일: 2025년 1월 28일*
*Architect 검증 완료: 2025년 1월 28일*
*10/10 업그레이드 v3: 2025년 1월 28일*
*예상 총 작업 시간: 9.5-10.5시간*
