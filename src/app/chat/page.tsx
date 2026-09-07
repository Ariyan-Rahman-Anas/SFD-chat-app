"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useConversations } from "@/hooks/useConversations";
import { useUnreadTracker } from "@/hooks/useUnreadTracker";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import type { Conversation } from "@/lib/types";

export default function ChatPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const { conversations, isLoading, error, refresh, upsertFromMessage } = useConversations();
  const { isUnread, markRead } = useUnreadTracker(user?._id ?? null);

  const selected = useMemo(
    () => conversations.find((c) => c._id === selectedId) ?? null,
    [conversations, selectedId],
  );

  async function handleStartDirect(userId: string) {
    const raw = await api.startConversation(userId);
    const list = await refresh();
    const full = list.find((c) => c._id === raw._id);
    if (full) setSelectedId(full._id);
  }

  async function handleGroupCreated() {
    const before = new Set(conversations.map((c) => c._id));
    const list = await refresh();
    const created = list.find((c) => !before.has(c._id));
    if (created) setSelectedId(created._id);
  }

  function handleOpened(conversationId: string, latestMessageAt?: string) {
    markRead(conversationId, latestMessageAt);
  }

  if (authLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* On mobile, show either the conversation list or the open chat —
          never both. From md upward, both columns are always visible. */}
      <div className={selected ? "hidden md:flex" : "flex w-full md:w-auto"}>
        <Sidebar
          currentUser={user}
          conversations={conversations}
          selectedId={selectedId}
          isLoading={isLoading}
          error={error}
          isUnread={(c: Conversation) =>
            isUnread(c._id, c.lastMessage?.createdAt, c.lastMessage?.sender)
          }
          onSelect={(c) => setSelectedId(c._id)}
          onStartDirect={handleStartDirect}
          onGroupCreated={handleGroupCreated}
          onRetry={() => refresh()}
          onLogout={() => {
            logout();
            router.replace("/login");
          }}
        />
      </div>
      <div className={selected ? "flex w-full min-w-0 md:w-auto md:flex-1" : "hidden md:flex md:flex-1"}>
        <ChatPanel
          conversation={selected}
          currentUser={user}
          onOpened={handleOpened}
          onBack={() => setSelectedId(null)}
          onMessageSent={upsertFromMessage}
        />
      </div>
    </div>
  );
}
