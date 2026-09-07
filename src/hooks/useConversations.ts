"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Conversation, Message, SocketMessage } from "@/lib/types";
import { normalizeSocketMessage } from "@/lib/socket";
import { useSocket } from "@/context/SocketContext";

function sortByRecency(list: Conversation[]): Conversation[] {
  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function useConversations() {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  conversationsRef.current = conversations;

  const refresh = useCallback(async (): Promise<Conversation[]> => {
    setError(null);
    try {
      const res = await api.listConversations();
      const sorted = sortByRecency(res.data);
      setConversations(sorted);
      return sorted;
    } catch {
      setError("Couldn't load your conversations. Please try again.");
      return conversationsRef.current;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertFromMessage = useCallback(
    (message: Message) => {
      const exists = conversationsRef.current.some((c) => c._id === message.conversation);
      if (!exists) {
        // A message arrived for a conversation we don't have cached yet
        // (e.g. we were just added to a group) — refetch to pick it up.
        refresh();
        return;
      }
      setConversations((prev) =>
        sortByRecency(
          prev.map((c) =>
            c._id === message.conversation
              ? {
                  ...c,
                  updatedAt: message.createdAt,
                  lastMessage: {
                    text: message.text,
                    sender: message.sender,
                    createdAt: message.createdAt,
                  },
                }
              : c,
          ),
        ),
      );
    },
    [refresh],
  );

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (raw: SocketMessage) => upsertFromMessage(normalizeSocketMessage(raw));
    const onConversationUpdated = () => refresh();

    socket.on("message:new", onNewMessage);
    socket.on("conversation:updated", onConversationUpdated);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("conversation:updated", onConversationUpdated);
    };
  }, [socket, upsertFromMessage, refresh]);

  return { conversations, isLoading, error, refresh, upsertFromMessage };
}
