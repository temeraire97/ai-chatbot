import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  streamText,
} from "ai";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { getResumeSystemPrompt, titlePrompt } from "@/lib/ai/prompts";
import { getLanguageModel, getTitleModel } from "@/lib/ai/providers";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import { retrieveResumeContext } from "@/lib/rag/retriever";
import type { ChatMessage } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch (_) {
    return null;
  }
}

export { getStreamContext };

/**
 * 제목 생성
 */
async function generateTitleFromUserMessage(
  userMessage: string
): Promise<string> {
  const { text } = await import("ai").then((m) =>
    m.generateText({
      model: getTitleModel(),
      system: titlePrompt,
      prompt: userMessage,
    })
  );

  return text.trim() || "새 대화";
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const { id, message, selectedVisibilityType, visitorId } = requestBody;

    // visitorId 검증 (선택적 - 없으면 익명)
    const finalVisitorId = visitorId || null;

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      // 기존 채팅 로드
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      // 새 채팅 생성
      await saveChat({
        id,
        visitorId: finalVisitorId,
        title: "New chat",
        visibility: selectedVisibilityType,
      });

      // 제목 생성 (비동기)
      const textPart = message.parts.find(
        (p): p is { type: "text"; text: string } => p.type === "text"
      );
      const userText = textPart?.text || "";
      if (userText) {
        titlePromise = generateTitleFromUserMessage(userText);
      }
    }

    const uiMessages = [
      ...convertToUIMessages(messagesFromDb),
      message as ChatMessage,
    ].filter(Boolean);

    // 사용자 메시지 저장
    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: message.id,
            role: "user",
            parts: message.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }

    // RAG: Resume 컨텍스트 검색
    const ragTextPart = message?.parts?.find(
      (p): p is { type: "text"; text: string } => p.type === "text"
    );
    const ragUserText = ragTextPart?.text || "";
    const resumeContext = await retrieveResumeContext(ragUserText);
    const systemPromptWithContext = getResumeSystemPrompt(resumeContext);

    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const result = streamText({
          model: getLanguageModel(),
          system: systemPromptWithContext,
          messages: modelMessages,
          // 도구 없음 (RAG만 사용)
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
        });

        dataStream.merge(result.toUIMessageStream());

        if (titlePromise) {
          const title = await titlePromise;
          dataStream.write({ type: "data-chat-title", data: title });
          updateChatTitleById({ chatId: id, title });
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              id: currentMessage.id,
              role: currentMessage.role,
              parts: currentMessage.parts,
              createdAt: new Date(),
              attachments: [],
              chatId: id,
            })),
          });
        }
      },
      onError: () => "Oops, an error occurred!",
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch (_) {
          // ignore redis errors
        }
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const visitorId = searchParams.get("visitorId");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const chat = await getChatById({ id });

  // visitorId 검증 (있으면 일치 확인)
  if (chat && visitorId && chat.visitorId !== visitorId) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
