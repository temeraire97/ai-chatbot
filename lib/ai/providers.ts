import { anthropic } from "@ai-sdk/anthropic";
import { customProvider } from "ai";
import { isTestEnvironment } from "../constants";

/**
 * Anthropic 직접 사용 (Claude Haiku 고정)
 * Vercel AI Gateway 대신 직접 연결
 */

const HAIKU_MODEL = "claude-3-5-haiku-20241022";

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

/**
 * 채팅용 LLM (Claude Haiku 고정)
 */
export function getLanguageModel(_modelId?: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("chat-model");
  }

  return anthropic(HAIKU_MODEL);
}

/**
 * 제목 생성용 LLM (Claude Haiku)
 */
export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  return anthropic(HAIKU_MODEL);
}
