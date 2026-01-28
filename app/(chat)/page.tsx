import { Suspense } from "react";
import { connection } from "next/server";
import { Chat } from "@/components/chat";
import { generateUUID } from "@/lib/utils";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <NewChatPage />
    </Suspense>
  );
}

async function NewChatPage() {
  await connection();
  const id = generateUUID();

  return (
    <Chat
      autoResume={false}
      id={id}
      initialMessages={[]}
      initialVisibilityType="private"
      isReadonly={false}
      key={id}
    />
  );
}
