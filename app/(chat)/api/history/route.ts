import type { NextRequest } from "next/server";
import {
  deleteAllChatsByVisitorId,
  getChatsByVisitorId,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");
  const visitorId = searchParams.get("visitorId");

  if (startingAfter && endingBefore) {
    return new ChatSDKError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }

  // visitorId 없으면 빈 결과 반환
  if (!visitorId) {
    return Response.json({ chats: [], hasMore: false });
  }

  const chats = await getChatsByVisitorId({
    visitorId,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const visitorId = searchParams.get("visitorId");

  if (!visitorId) {
    return new ChatSDKError(
      "bad_request:api",
      "visitorId is required"
    ).toResponse();
  }

  const result = await deleteAllChatsByVisitorId({ visitorId });

  return Response.json(result, { status: 200 });
}
