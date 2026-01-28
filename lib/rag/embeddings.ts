import { openai } from "@ai-sdk/openai";
import { embed } from "ai";

/**
 * OpenAI 임베딩 클라이언트 with LRU 캐싱
 * text-embedding-3-small (1536 dimensions)
 */

// LRU 캐시 (메모리)
const embeddingCache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 100;

/**
 * 질문 정규화 (동일 의미 질문 캐시 히트)
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[?!。？！]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * 문자열 해시 (캐시 키)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash;
  }
  return hash.toString(36);
}

/**
 * 임베딩 생성 (캐싱 포함)
 */
export async function getEmbedding(query: string): Promise<number[]> {
  const normalized = normalizeQuery(query);
  const cacheKey = hashString(normalized);

  // 캐시 히트
  const cached = embeddingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // OpenAI 임베딩 생성
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    // LRU 캐시 관리
    if (embeddingCache.size >= MAX_CACHE_SIZE) {
      const firstKey = embeddingCache.keys().next().value;
      if (firstKey) {
        embeddingCache.delete(firstKey);
      }
    }
    embeddingCache.set(cacheKey, embedding);

    return embedding;
  } catch (error) {
    console.error("[Embeddings] OpenAI API error:", error);
    throw error;
  }
}

/**
 * 여러 텍스트의 임베딩 생성 (배치)
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (const text of texts) {
    const embedding = await getEmbedding(text);
    results.push(embedding);
  }

  return results;
}

/**
 * 캐시 클리어
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * 캐시 상태 조회
 */
export function getEmbeddingCacheStats(): { size: number; maxSize: number } {
  return {
    size: embeddingCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}
