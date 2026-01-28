/**
 * Resume Chunks - 윤현수 이력서 기반 RAG용 청크 데이터
 * 300-500 토큰 목표, 섹션 기반 분할
 */

export interface ResumeChunk {
  id: string;
  title: string;
  content: string;
  section: "intro" | "project" | "skills" | "core" | "motivation";
  keywords: string[];
  relatedChunks: string[];
}

export const resumeChunks: ResumeChunk[] = [
  {
    id: "intro",
    title: "기본 정보 및 자기소개",
    section: "intro",
    keywords: [
      "윤현수",
      "이름",
      "이메일",
      "연락처",
      "경력",
      "프론트엔드",
      "자기소개",
      "소개",
    ],
    relatedChunks: ["skills-frontend", "core-websocket"],
    content: `# 기본 정보
- 이름: 윤현수
- 이메일: hyensooyoon@gmail.com
- 연락처: +82 10-2427-2688
- 경력: 5년 (프론트엔드 4년 10개월, 프론트엔드 리드 3년 6개월)

# 자기소개
실시간 통신 시스템과 재사용 가능한 프론트엔드 자산을 설계/구현한 프론트엔드 개발자입니다.
오픈메타(3년 6개월)에서 프론트엔드 리드로 WebSocket 양방향 실시간 통신을 직접 구현했습니다.
heartbeat/재연결 관리, 에러 핸들링, TanStack Query 연동으로 응답 지연을 93% 개선했습니다 (3초 → 200ms).
EditUp에서는 CMS Adapter 아키텍처(Template Method + Registry Pattern)를 설계하여 5개 CMS를 단일 인터페이스로 지원하는 재사용 가능한 자산을 구축했습니다.
웹/확장/애드인 3개 플랫폼에서 코드 재사용률 70%+를 달성했습니다.
LG ES Chatbot에서 RAG 파이프라인용 Milvus 벡터 검색 서비스(58 commits)와 관리자 프론트엔드(39 commits)를 전체 개발했습니다.`,
  },
  {
    id: "project-openmeta",
    title: "오픈메타시티 스왑 - WebSocket 실시간 통신",
    section: "project",
    keywords: [
      "오픈메타",
      "WebSocket",
      "실시간",
      "통신",
      "heartbeat",
      "재연결",
      "블록체인",
      "트랜잭션",
      "polling",
    ],
    relatedChunks: ["project-openmeta-detail", "core-websocket"],
    content: `# 오픈메타시티 스왑 - WebSocket 실시간 통신 (채팅팀 핵심)
블록체인 트랜잭션 실시간 상태 전달 시스템 | 오픈메타 주식회사 (2021.08 - 2025.01, 3년 6개월)

## 문제 정의
- 블록체인 트랜잭션(스왑, 전송)의 처리 과정을 유저에게 실시간으로 전달해야 함
- 기존 polling 방식: 서버 부하 높음, 응답 지연 평균 3초, UX 저하
- 연결 끊김 시 상태 불일치 문제 발생

## 해결 (WebSocket 양방향 통신 직접 구현)
- WebSocket 라이브러리: ws (Node.js 서버) + Native WebSocket (브라우저)
- heartbeat: 15초 주기 ping 메시지, Pong 미수신 시 연결 종료
- 자동 재연결: 연결 끊김 시 1초 후 재시도
- 메시지 타입: ping, do_update, done_update, build_complete (타입 안전성 확보)
- 에러 핸들링: 연결 끊김 감지, 폴백 처리, 타임아웃 관리
- TanStack Query 연동: staleTime 1분, gcTime 5분으로 캐시와 실시간 상태 통합`,
  },
  {
    id: "project-openmeta-detail",
    title: "오픈메타시티 스왑 - 성과 및 기술 스택",
    section: "project",
    keywords: [
      "오픈메타",
      "성과",
      "응답 지연",
      "93%",
      "개선",
      "Vue",
      "TanStack Query",
      "NestJS",
      "Redis",
    ],
    relatedChunks: ["project-openmeta", "skills-frontend"],
    content: `# 오픈메타시티 스왑 - 성과 및 기술 스택

## 성과
| 지표 | 개선 전 | 개선 후 | 성과 |
|------|--------|--------|------|
| 응답 지연 | 3초 | 200ms 이하 | 93% 개선 |
| 서버 부하 | polling 부하 | WebSocket 유지 | 부하 제거 |
| 사용자 체감 | 지연됨 | 즉각 반응 | UX 향상 |

## 기술 스택
Vue, TanStack Query, TypeScript, WebSocket, NestJS, TypeORM, Prisma, Redis

## 기타 오픈메타 프로젝트
- 오픈메타시티 어드민: Vue + Pinia + Chart.js 데이터 시각화 대시보드
- 오픈메타시티: Vue + Vuex, maplibre 지도 운용, AWS S3 + CDN 이미지 캐싱
- 수심달 블루: Nuxt SSG/ISR/SSR, Docker + AWS Fargate 컨테이너 관리
- 마을이야기 페이 (Flutter): 네이티브 앱 내 지도 웹뷰 개발, iOS WKWebView / Android WebView 플랫폼별 최적화
- 카카오톡 인앱 브라우저 OAuth: 구글 OAuth 403 disallowed_useragent 에러 → 외부 브라우저 리다이렉트로 해결`,
  },
  {
    id: "project-editup",
    title: "EditUp - CMS Adapter 아키텍처",
    section: "project",
    keywords: [
      "EditUp",
      "CMS",
      "Adapter",
      "SDK",
      "아키텍처",
      "Template Method",
      "Registry Pattern",
      "조선일보",
      "이투데이",
      "한경",
    ],
    relatedChunks: ["project-editup-detail", "core-sdk"],
    content: `# EditUp - CMS Adapter 아키텍처 (SDK 설계 경험)
AI 한국어 문장 교정 플랫폼 (멀티 서비스 아키텍처)

## 문제 정의
- 멀티 플랫폼 지원 필요: 웹, Chrome/Firefox 확장, Word 애드인 3개 플랫폼 동시 개발
- 다양한 CMS 지원: 조선일보, 이투데이, 한경닷컴 등 각기 다른 DOM 구조의 CMS 에디터 지원
- 복잡한 AI 파이프라인: 다단계 교정 파이프라인 + LLM Failover 필요
- 인프라 관리 복잡도: 다중 서비스 배포 및 A/B 배포 전략 필요

## CMS Adapter 아키텍처 (Template Method + Registry Pattern)
extension/pages/content-runtime/lib/cms/
├── BaseCmsAdapter.ts      # 추상 기본 클래스 (559줄)
├── CmsRegistry.ts         # 싱글톤 Registry (263줄)
└── adapters/
    ├── ChosunAdapter.ts   # 조선일보 (Lexical 에디터)
    ├── EtodayAdapter.ts   # 이투데이 (textarea 기반)
    ├── KhanAdapter.ts     # 한경닷컴 (iframe 에디터)
    ├── NbSoftAdapter.ts   # NB Soft (iframe contentDocument)
    └── DefaultAdapter.ts  # 일반 웹사이트 (Selection 모드)`,
  },
  {
    id: "project-editup-detail",
    title: "EditUp - 담당업무 상세 (Git 기반)",
    section: "project",
    keywords: [
      "EditUp",
      "NestJS",
      "백엔드",
      "GPT-4o",
      "Failover",
      "Extension",
      "Next.js",
      "Terraform",
      "FastAPI",
    ],
    relatedChunks: ["project-editup", "skills-backend"],
    content: `# EditUp - 담당 업무 상세 (Git 기반)

## 1. NestJS 백엔드 서비스 (311 commits, 75% 기여)
- GPT-4o Failover 3단계 시스템: Primary(Upstage Solar) → Failover(GPT-4o) → Fallback
- 트리거 조건: StageTimeoutError, HTTP 5xx, 429 Rate Limit, 네트워크 에러
- TypeScript strict mode: 전체 엔티티 타입 명시
- Redis 원자성: MULTI/EXEC, Lua Script로 동시성 문제 해결

## 2. Chrome/Firefox Extension (121 commits, 67% 기여)
- SDK적 설계 패턴: Template Method, Registry, Adapter Pattern
- CMS별 DOM 조작 추상화

## 3. Next.js 웹 클라이언트 (113 commits)
- Next.js 16.1.1 + ESLint flat config + Turbopack dev

## 4. Terraform 인프라 (32 commits, 100% 단독 개발)
- A/B Slot 배포, weighted traffic routing, CloudWatch + Slack 알림

## 5. Python KSS 서비스 (21 commits, 95% 기여)
- FastAPI Best Practices, DI 패턴, poetry → uv 마이그레이션

## 성과
- CMS 지원: 1개 → 5개 (Adapter 아키텍처)
- 3개 플랫폼 동시 운영 달성
- Extension 빌드: 3분 → 45초 (4배 단축)`,
  },
  {
    id: "project-lg",
    title: "LG ES Chatbot - RAG 벡터 검색",
    section: "project",
    keywords: [
      "LG",
      "LG전자",
      "Chatbot",
      "RAG",
      "Milvus",
      "벡터",
      "검색",
      "FastAPI",
      "Vite",
      "TanStack Router",
    ],
    relatedChunks: ["core-fullstack", "skills-backend"],
    content: `# LG ES Chatbot
LG전자 고객 상담용 AI 플랫폼

## 문제 정의
- 기존 FAQ 시스템의 낮은 적중률: 기계식 키워드 매칭으로 인해 답변 정확도 45% 수준
- 벡터 검색 시스템 필요: RAG 파이프라인을 위한 고성능 벡터 DB 서비스 구축
- 관리자 도구 부재: 지식 관리, 통계, 데이터 분석을 위한 백오피스 필요

## 담당 업무 (Git 기반)
1. Milvus 벡터 검색 서비스 (58 commits, 100%)
   - Python FastAPI 기반 RAG 벡터 검색 서비스 전체 개발
   - hybrid_search API: 벡터 + 키워드 하이브리드 검색
   - FAQ 컬렉션 스키마 설계 (faq, faq_pending)

2. 관리자 프론트엔드 (39 commits, 메인 개발자)
   - Vite + TanStack Router 기반 관리자 대시보드 전체 개발 (8개 페이지)

3. AI Agent 설계 참여 + 테스트 담당
   - 기술 스택 선정: Google ADK + LangChain4j 도입 결정
   - Resilience 패턴 설계: Circuit Breaker, Retry, Timeout

## 성과
- 응답 적중률: 45% → 89% (44%p 개선)
- 벡터 검색 정확도: 95%+`,
  },
  {
    id: "project-shinsegae",
    title: "신세계 면세점 챗봇",
    section: "project",
    keywords: [
      "신세계",
      "면세점",
      "챗봇",
      "Vue2",
      "Express",
      "DialogFlow",
      "Oracle",
    ],
    relatedChunks: ["skills-frontend", "skills-backend"],
    content: `# 신세계 면세점 챗봇
챗봇 유지보수 | 젠틀파이 (2025.03 - 현재)

## 담당 업무
- Vue2 프론트엔드 + Express.js 백엔드 운영
- DialogFlow를 활용한 자연어 처리
- Oracle DB 쿼리문 개선으로 응답 속도 개선`,
  },
  {
    id: "skills-frontend",
    title: "기술 스택 - Frontend",
    section: "skills",
    keywords: [
      "기술 스택",
      "React",
      "Next.js",
      "TypeScript",
      "Jotai",
      "TanStack Query",
      "shadcn",
      "Radix",
      "Tailwind",
    ],
    relatedChunks: ["skills-backend", "intro"],
    content: `# 기술 스택 - Frontend

## 프레임워크
- React 19, Next.js 16 (App Router, RSC)

## 언어
- TypeScript 5.x (strict mode)

## 상태관리
- Jotai (클라이언트), TanStack Query (서버)

## 라우팅
- TanStack Router, Next.js App Router

## UI
- shadcn/ui, Radix UI, Tailwind CSS

## 테스트
- Vitest, React Testing Library, MSW

## 빌드
- Turbo (모노레포), Vite, Webpack

## 개발 도구
- AI 도구: Claude Code, Cursor (적극 활용)
- 버전관리: Git, GitHub`,
  },
  {
    id: "skills-backend",
    title: "기술 스택 - Backend/Infra",
    section: "skills",
    keywords: [
      "기술 스택",
      "NestJS",
      "FastAPI",
      "Milvus",
      "AWS",
      "Terraform",
      "Docker",
      "Jenkins",
      "Redis",
    ],
    relatedChunks: ["skills-frontend", "core-fullstack"],
    content: `# 기술 스택 - Backend/Infra

## Backend
- Node.js: NestJS 11, TypeORM
- Python: FastAPI, Uvicorn, structlog
- Vector DB: Milvus (6-Collection 아키텍처)
- AI/LLM: GPT-4o, Upstage Solar (Failover 시스템)

## Infrastructure
- Cloud: AWS (ECS Fargate, RDS, ALB, S3, CloudFront, ECR)
- IaC: Terraform (A/B Slot 배포, weighted routing)
- Container: Docker (멀티스테이지 빌드)
- CI/CD: Jenkins (ECR → ECS 자동 배포)
- Monitoring: CloudWatch + Slack 알림

## 테스트
- Backend: Vitest + Supertest (NestJS), Pytest (Python)
- 부하 테스트: stress-test 모듈 (multi API key round-robin)`,
  },
  {
    id: "core-websocket",
    title: "핵심 역량 - 실시간 통신 시스템",
    section: "core",
    keywords: [
      "WebSocket",
      "실시간",
      "통신",
      "heartbeat",
      "재연결",
      "TanStack Query",
      "Exponential Backoff",
    ],
    relatedChunks: ["project-openmeta", "core-sdk"],
    content: `# 핵심 역량 - 실시간 통신 시스템 (채팅팀 핵심)

## WebSocket 양방향 통신
- 오픈메타시티 스왑에서 실시간 트랜잭션 상태 전달

## 연결 관리
- ws 라이브러리(서버) + Native WebSocket(클라이언트)

## heartbeat
- 15초 주기 ping 메시지, 연결 상태 모니터링

## 자동 재연결
- 연결 끊김 시 1초 후 재시도

## 메시지 프로토콜
- 타입 기반 메시지 (ping, do_update, done_update, build_complete)

## TanStack Query 통합
- staleTime 1분, gcTime 5분 캐시 전략

## 개선 방향
- 고정 지연 → Exponential Backoff 전환 검토 (500ms base, 30초 max)`,
  },
  {
    id: "core-sdk",
    title: "핵심 역량 - SDK/재사용 자산 설계",
    section: "core",
    keywords: [
      "SDK",
      "CMS Adapter",
      "Template Method",
      "Registry Pattern",
      "재사용",
      "공유 패키지",
      "모노레포",
    ],
    relatedChunks: ["project-editup", "core-websocket"],
    content: `# 핵심 역량 - SDK적 설계 / 재사용 자산 (Git 검증)

## CMS Adapter 아키텍처
- Template Method + Registry Pattern으로 5개 CMS 지원
- BaseCmsAdapter 추상 클래스 (559줄): 공통 로직 제공
- CmsRegistry 싱글톤: URL 기반 CMS 자동 감지
- CMS별 Adapter: 조선(Lexical), 이투데이(textarea), 한경(iframe) 등

## 공유 패키지 설계
- Extension packages/ (ui, storage, shared, hmr, dev-utils)

## 스트리밍 텍스트 구조 통일
- 웹/확장 간 문단/문장 단위 스트리밍 방식 동일화

## 성과
- 웹/확장/애드인 3개 플랫폼 코드 재사용률 70%+ 달성
- Turbo 모노레포로 Extension 빌드 4배 최적화 (3분 → 45초)`,
  },
  {
    id: "core-fullstack",
    title: "핵심 역량 - 풀스택 이해도",
    section: "core",
    keywords: [
      "풀스택",
      "NestJS",
      "FastAPI",
      "GPT-4o",
      "Failover",
      "API",
      "타입 안전성",
    ],
    relatedChunks: ["skills-backend", "project-lg"],
    content: `# 핵심 역량 - 풀스택 이해도 (백엔드 협업 경험)

## NestJS 백엔드 설계/구현 경험
- API 설계 협업 원활

## GPT-4o Failover 3단계 시스템
- Solar → GPT-4o → Fallback 자동 전환
- 트리거 조건: StageTimeoutError, HTTP 5xx, 429 Rate Limit, 네트워크 에러
- 단계별 타임아웃 + 40초 전체 파이프라인 타임아웃 (AbortController)

## Python FastAPI 마이크로서비스 개발
- Milvus 벡터 검색

## 프론트엔드-백엔드 인터페이스 설계
- 타입 안전성 확보

## 인프라 & DevOps (32+ commits)
- Terraform으로 AWS 인프라 전체 코드화
- A/B Slot 배포 전략, weighted traffic routing
- Jenkins CI/CD 파이프라인 구축
- CloudWatch 알람 + Slack 한국어 알림`,
  },
  {
    id: "core-mobile",
    title: "핵심 역량 - 모바일 웹뷰 경험",
    section: "core",
    keywords: [
      "모바일",
      "웹뷰",
      "Flutter",
      "WKWebView",
      "WebView",
      "카카오톡",
      "OAuth",
      "JavaScriptChannel",
    ],
    relatedChunks: ["project-openmeta-detail", "core-websocket"],
    content: `# 핵심 역량 - 모바일 웹뷰 경험 (채팅팀 핵심)

## Flutter 웹뷰 네이티브 엔진 최적화
- 마을이야기 페이 "지도" 웹뷰 (iOS WKWebView, Android WebView)

## 카카오톡 인앱 브라우저 OAuth 우회
- 구글 OAuth 403 disallowed_useragent → 외부 브라우저 리다이렉트

## Flutter-웹 브릿지 통신
- JavaScriptChannel, NavigationDelegate로 양방향 데이터 전달

## 웹뷰 특성 이해
- 플랫폼별 쿠키 동기화, 하드웨어 가속, 스크롤 동기화`,
  },
  {
    id: "why-daangn",
    title: "왜 당근 채팅팀인가",
    section: "motivation",
    keywords: [
      "당근",
      "채팅팀",
      "지원 동기",
      "기대",
      "기여",
      "2000만",
      "사용자",
    ],
    relatedChunks: ["core-websocket", "core-sdk"],
    content: `# 왜 당근 채팅팀인가?

당근의 채팅이 "모든 서비스가 만나는 교차로"라는 점에 공감합니다.

## 당근 기술 스택과의 적합성
| 당근 채팅팀 스택 | 내 경험 |
|-----------------|---------|
| WebSocket 실시간 통신 | 오픈메타에서 WebSocket 양방향 통신 직접 구현 (15초 heartbeat, 자동 재연결) |
| 모바일 웹뷰 채팅 | Flutter 웹뷰 (iOS WKWebView / Android WebView), 카카오톡 인앱 OAuth 우회 |
| Redis 세션 관리 | EditUp에서 Redis 원자성 (MULTI/EXEC, Lua Script, 분산 락) 구현 |
| React + Next.js + TypeScript | Next.js 16 + React 19 + React Compiler, TypeScript strict mode |
| MSA 아키텍처 | NestJS + FastAPI 마이크로서비스, Terraform IaC |
| 2,200만 사용자 규모 | 확장성 고려한 설계 경험 (커넥션 풀링, 캐싱, 비동기 처리) |

## 기대하는 기여
이 경험을 당근 채팅팀에서 2,000만 사용자가 매일 거래를 완결하는 채팅 경험을 더 빠르고 안정적으로 만드는 데 활용하고 싶습니다.`,
  },
];

/**
 * 전체 Resume 컨텍스트 (Fallback용)
 */
export function getFullResumeContext(): string {
  return resumeChunks.map((chunk) => chunk.content).join("\n\n---\n\n");
}

/**
 * 기본 청크 가져오기 (Fallback용)
 */
export function getDefaultChunks(): ResumeChunk[] {
  return resumeChunks.filter((chunk) =>
    ["intro", "skills-frontend", "skills-backend"].includes(chunk.id)
  );
}
