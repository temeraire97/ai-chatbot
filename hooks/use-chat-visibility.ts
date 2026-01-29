"use client";

import { useOptimistic } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { updateChatVisibility } from "@/app/(chat)/actions";
import {
  type ChatHistory,
  getChatHistoryPaginationKey,
} from "@/components/sidebar-history";
import type { VisibilityType } from "@/components/visibility-selector";

export function useChatVisibility({
  chatId,
  initialVisibilityType,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
}) {
  const { mutate, cache } = useSWRConfig();
  const history: ChatHistory = cache.get("/api/history")?.data;

  const chat = history?.chats.find((currentChat) => currentChat.id === chatId);
  const serverVisibility = chat?.visibility ?? initialVisibilityType;

  const [optimisticVisibility, setOptimisticVisibility] = useOptimistic(
    serverVisibility,
    (_currentState, newVisibility: VisibilityType) => newVisibility
  );

  const setVisibilityType = async (updatedVisibilityType: VisibilityType) => {
    setOptimisticVisibility(updatedVisibilityType);

    try {
      await updateChatVisibility({
        chatId,
        visibility: updatedVisibilityType,
      });
      // Revalidate cache AFTER success
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    } catch {
      // The async transition ending will discard optimistic value and restore original state
    }
  };

  return { visibilityType: optimisticVisibility, setVisibilityType };
}
