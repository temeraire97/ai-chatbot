import {
  getDefaultChunks,
  getFullResumeContext,
  type ResumeChunk,
  resumeChunks,
} from "../resume/chunks";
import { getEmbedding } from "./embeddings";
import { searchVectors } from "./vector-store";

/**
 * RAG Retriever - Resume 컨텍스트 검색
 * Zilliz 벡터 검색 + Fallback 전략
 */

const SEARCH_TIMEOUT_MS = 3000;
const DEFAULT_TOP_K = 3;

/**
 * 키워드 기반 검색 (Fallback용)
 */
function keywordSearch(query: string, topK = 3): ResumeChunk[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  // 키워드 매칭 점수 계산
  const scored = resumeChunks.map((chunk) => {
    let score = 0;

    // 제목 매칭 (가중치 높음)
    if (chunk.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // 키워드 매칭
    for (const keyword of chunk.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (queryLower.includes(keywordLower)) {
        score += 5;
      }
      for (const word of queryWords) {
        if (keywordLower.includes(word) || word.includes(keywordLower)) {
          score += 2;
        }
      }
    }

    // 컨텐츠 매칭
    for (const word of queryWords) {
      if (word.length >= 2 && chunk.content.toLowerCase().includes(word)) {
        score += 1;
      }
    }

    return { chunk, score };
  });

  // 점수순 정렬 및 상위 K개 반환
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.chunk);
}

/**
 * 동적 top-k 결정
 */
function determineTopK(query: string): number {
  const broadQueries = [
    "모든",
    "전체",
    "모두",
    "all",
    "경력",
    "프로젝트",
    "스킬",
    "기술 스택",
  ];

  for (const broad of broadQueries) {
    if (query.includes(broad)) {
      return 5;
    }
  }

  return DEFAULT_TOP_K;
}

/**
 * Resume 컨텍스트 검색 (메인 함수)
 */
export async function retrieveResumeContext(query: string): Promise<string> {
  const topK = determineTopK(query);

  try {
    // 임베딩 생성
    const embedding = await getEmbedding(query);

    // Zilliz 벡터 검색 (타임아웃 적용)
    const searchPromise = searchVectors(embedding, topK);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), SEARCH_TIMEOUT_MS)
    );

    const results = await Promise.race([searchPromise, timeoutPromise]);

    if (results && results.length > 0) {
      // 벡터 검색 성공
      return formatSearchResults(results);
    }

    // 검색 결과 없음 - Fallback
    console.warn("[Retriever] Empty search results, using keyword fallback");
    return fallbackToKeywordSearch(query, topK);
  } catch (error) {
    // Zilliz 연결 실패 - Fallback
    console.error("[Retriever] Vector search failed:", error);
    return fallbackToKeywordSearch(query, topK);
  }
}

/**
 * 키워드 검색 Fallback
 */
function fallbackToKeywordSearch(query: string, topK: number): string {
  const keywordResults = keywordSearch(query, topK);

  if (keywordResults.length > 0) {
    return keywordResults
      .map((chunk) => `## ${chunk.title}\n\n${chunk.content}`)
      .join("\n\n---\n\n");
  }

  // 최종 Fallback: 기본 청크
  console.warn("[Retriever] Keyword search failed, using default chunks");
  const defaultChunks = getDefaultChunks();
  return defaultChunks
    .map((chunk) => `## ${chunk.title}\n\n${chunk.content}`)
    .join("\n\n---\n\n");
}

/**
 * 검색 결과 포맷팅
 */
function formatSearchResults(
  results: Array<{
    id: string;
    title: string;
    content: string;
    section: string;
    score: number;
  }>
): string {
  return results
    .map((r) => `## ${r.title}\n\n${r.content}`)
    .join("\n\n---\n\n");
}

/**
 * 전체 컨텍스트 반환 (Fallback용)
 */
export function getFullContext(): string {
  return getFullResumeContext();
}
