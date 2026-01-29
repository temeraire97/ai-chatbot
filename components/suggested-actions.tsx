"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import { memo } from "react";
import type { ChatMessage } from "@/lib/types";
import { Suggestion } from "./elements/suggestion";
import type { VisibilityType } from "./visibility-selector";

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  selectedVisibilityType: VisibilityType;
  suggestions?: string[];
  isLoading?: boolean;
  onAfterSend?: () => void;
};

function PureSuggestedActions({
  chatId,
  sendMessage,
  suggestions,
  isLoading,
  onAfterSend,
}: SuggestedActionsProps) {
  const defaultSuggestions = [
    "윤현수의 기술 스택이 뭐야?",
    "실시간 처리 경험이 있어?",
    "WebSocket 경험이 있어?",
    "프로젝트 경험을 알려줘",
  ];

  // Use provided suggestions or fallback to defaults
  const displaySuggestions =
    suggestions && suggestions.length > 0 ? suggestions : defaultSuggestions;

  if (isLoading) {
    return (
      <div
        className="grid w-full gap-2 sm:grid-cols-2"
        data-testid="suggested-actions-loading"
      >
        {[1, 2, 3].map((i) => (
          <div className="h-12 animate-pulse rounded-full bg-muted" key={i} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {displaySuggestions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={suggestedAction}
          transition={{ delay: 0.05 * index }}
        >
          <Suggestion
            className="h-auto w-full whitespace-normal p-3 text-left"
            onClick={(suggestion) => {
              window.history.pushState({}, "", `/chat/${chatId}`);
              sendMessage({
                role: "user",
                parts: [{ type: "text", text: suggestion }],
              });
              // DOM 업데이트 후 스크롤
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  onAfterSend?.();
                });
              });
            }}
            suggestion={suggestedAction}
          >
            {suggestedAction}
          </Suggestion>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (!equal(prevProps.suggestions, nextProps.suggestions)) {
      return false;
    }
    return true;
  }
);
