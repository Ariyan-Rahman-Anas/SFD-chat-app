"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Message, SocketMessage } from "@/lib/types";
import { normalizeSocketMessage } from "@/lib/socket";
import { useSocket } from "@/context/SocketContext";

export function useMessages(conversationId: string | null) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    seenIds.current = new Set();

    api
      .getMessages(conversationId, { limit: 30 })
      .then((res) => {
        if (cancelled) return;
        // Server returns newest-first; reverse for top-to-bottom rendering.
        const ordered = [...res.messages].reverse();
        ordered.forEach((m) => seenIds.current.add(m._id));
        setMessages(ordered);
        setHasMore(res.hasMore);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load messages. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!conversationId || messages.length === 0 || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const oldest = messages[0];
      const res = await api.getMessages(conversationId, {
        limit: 30,
        before: oldest._id,
      });
      const ordered = [...res.messages].reverse().filter((m) => {
        if (seenIds.current.has(m._id)) return false;
        seenIds.current.add(m._id);
        return true;
      });
      setMessages((prev) => [...ordered, ...prev]);
      setHasMore(res.hasMore);
    } catch {
      setError("Couldn't load older messages.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, messages, isLoadingMore]);

  const addMessage = useCallback((message: Message) => {
    if (seenIds.current.has(message._id)) return;
    seenIds.current.add(message._id);
    setMessages((prev) => [...prev, message]);
  }, []);

  useEffect(() => {
    if (!socket || !conversationId) return;
    const onNewMessage = (raw: SocketMessage) => {
      const message = normalizeSocketMessage(raw);
      if (message.conversation === conversationId) addMessage(message);
    };
    socket.on("message:new", onNewMessage);
    return () => {
      socket.off("message:new", onNewMessage);
    };
  }, [socket, conversationId, addMessage]);

  return { messages, isLoading, isLoadingMore, hasMore, error, loadMore, addMessage };
}
