/**
 * 모델 설정 - Claude Haiku 고정
 */

export const DEFAULT_CHAT_MODEL = "claude-3-5-haiku-20241022";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

// 단일 모델 (Haiku 고정)
export const chatModels: ChatModel[] = [
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude Haiku",
    provider: "anthropic",
    description: "Fast and efficient for resume Q&A",
  },
];

// Provider별 그룹화 (UI용, 단일 모델이므로 간소화)
export const modelsByProvider = {
  anthropic: chatModels,
};
