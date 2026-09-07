"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { DateDivider } from "./DateDivider";
import { useMessages } from "@/hooks/useMessages";
import { api } from "@/lib/api";
import type { Conversation, User } from "@/lib/types";

const NEAR_BOTTOM_THRESHOLD = 120;
const NEAR_TOP_THRESHOLD = 80;

export function ChatPanel({
  conversation,
  currentUser,
  onOpened,
}: {
  conversation: Conversation | null;
  currentUser: User;
  onOpened: (conversationId: string, latestMessageAt?: string) => void;
}) {
  const { messages, isLoading, isLoadingMore, hasMore, error, loadMore, addMessage } =
    useMessages(conversation?._id ?? null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const prevScrollHeight = useRef<number>(0);
  const prevMessageCount = useRef(0);

  const senderNameById =
    conversation?.type === "group"
      ? new Map(conversation.participants.map((p) => [p._id, p.name]))
      : null;

  function scrollToBottom(behavior: ScrollBehavior = "auto") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  // Reset scroll state whenever the selected conversation changes.
  useEffect(() => {
    setIsNearBottom(true);
    setShowJumpToLatest(false);
    prevMessageCount.current = 0;
  }, [conversation?._id]);

  // Jump to the bottom once the first page of a conversation has loaded.
  useLayoutEffect(() => {
    if (!isLoading && messages.length > 0 && prevMessageCount.current === 0) {
      scrollToBottom("auto");
      prevMessageCount.current = messages.length;
    }
  }, [isLoading, messages.length]);

  // Keep the view pinned to the bottom for new messages, but only if the
  // user hasn't scrolled up to read earlier ones.
  useLayoutEffect(() => {
    if (messages.length <= prevMessageCount.current) {
      prevMessageCount.current = messages.length;
      return;
    }
    const grew = messages.length > prevMessageCount.current;
    prevMessageCount.current = messages.length;
    if (!grew) return;

    if (isNearBottom) {
      scrollToBottom("smooth");
      if (conversation) onOpened(conversation._id, messages[messages.length - 1]?.createdAt);
    } else {
      setShowJumpToLatest(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isNearBottom]);

  // Mark the conversation as read once it's open and settled at the bottom.
  useEffect(() => {
    if (!isLoading && conversation && messages.length > 0 && isNearBottom) {
      onOpened(conversation._id, messages[messages.length - 1]?.createdAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, conversation?._id, isNearBottom]);

  async function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
    setIsNearBottom(nearBottom);
    if (nearBottom) setShowJumpToLatest(false);

    if (el.scrollTop < NEAR_TOP_THRESHOLD && hasMore && !isLoadingMore) {
      prevScrollHeight.current = el.scrollHeight;
      await loadMore();
    }
  }

  // Preserve scroll position after prepending older messages.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || prevScrollHeight.current === 0) return;
    const newHeight = el.scrollHeight;
    el.scrollTop += newHeight - prevScrollHeight.current;
    prevScrollHeight.current = 0;
  }, [messages]);

  async function handleSend(text: string) {
    if (!conversation) return;
    const message = await api.sendMessage(conversation._id, text);
    addMessage(message);
    scrollToBottom("smooth");
    onOpened(conversation._id, message.createdAt);
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-neutral-50 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
          <MessageCircle className="h-7 w-7" />
        </div>
        <p className="mt-4 text-sm font-medium text-neutral-500">
          Select a conversation
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Or start a new one from the sidebar.
        </p>
      </div>
    );
  }

  const title =
    conversation.type === "group" ? conversation.name : conversation.participant.name;
  const subtitle =
    conversation.type === "group"
      ? `${conversation.participants.length} members`
      : conversation.participant.phone;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-neutral-50">
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-white p-4">
        <Avatar name={title} isGroup={conversation.type === "group"} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">{title}</p>
          <p className="truncate text-xs text-neutral-400">{subtitle}</p>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-4 py-4"
        >
          {isLoading && (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          )}

          {!isLoading && error && (
            <p className="py-10 text-center text-sm text-red-500">{error}</p>
          )}

          {!isLoading && !error && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-neutral-500">No messages yet</p>
              <p className="mt-1 text-xs text-neutral-400">Say hello 👋</p>
            </div>
          )}

          {!isLoading && isLoadingMore && (
            <div className="flex justify-center pb-3">
              <Spinner className="h-4 w-4" />
            </div>
          )}

          {!isLoading &&
            messages.map((message, i) => {
              const prev = messages[i - 1];
              const showDivider =
                !prev ||
                new Date(prev.createdAt).toDateString() !==
                  new Date(message.createdAt).toDateString();
              const isOwn = message.sender === currentUser._id;
              const showSenderName =
                conversation.type === "group" && !isOwn && (!prev || prev.sender !== message.sender);

              return (
                <div key={message._id}>
                  {showDivider && <DateDivider iso={message.createdAt} />}
                  <div className="mb-1.5">
                    <MessageBubble
                      message={message}
                      isOwn={isOwn}
                      senderName={
                        showSenderName ? senderNameById?.get(message.sender) : undefined
                      }
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {showJumpToLatest && (
          <button
            onClick={() => {
              scrollToBottom("smooth");
              setShowJumpToLatest(false);
            }}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            New messages
          </button>
        )}
      </div>

      <MessageComposer onSend={handleSend} />
    </div>
  );
}
