/**
 * Visitor ID 관리 유틸리티
 * localStorage 기반 익명 사용자 식별
 */

const VISITOR_ID_KEY = "visitorId";

/**
 * 클라이언트에서 visitorId 가져오기 (없으면 생성)
 */
export function getVisitorId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const stored = localStorage.getItem(VISITOR_ID_KEY);
  if (stored) {
    return stored;
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(VISITOR_ID_KEY, newId);
  return newId;
}

/**
 * visitorId 초기화 (새 세션 시작)
 */
export function resetVisitorId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(VISITOR_ID_KEY, newId);
  return newId;
}

/**
 * 현재 visitorId 확인 (생성 안 함)
 */
export function getCurrentVisitorId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(VISITOR_ID_KEY);
}
