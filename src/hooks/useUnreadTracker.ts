"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The API has no read-receipt concept, so "unread" is tracked entirely on
 * the client: we remember when each conversation was last opened and
 * compare that against the newest message's timestamp.
 */
export function useUnreadTracker(userId: string | null) {
  const storageKey = userId ? `chat_app_last_read_${userId}` : null;
  const [lastRead, setLastRead] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      setLastRead(raw ? JSON.parse(raw) : {});
    } catch {
      setLastRead({});
    }
  }, [storageKey]);

  const markRead = useCallback(
    (conversationId: string, at: string = new Date().toISOString()) => {
      if (!storageKey) return;
      setLastRead((prev) => {
        const next = { ...prev, [conversationId]: at };
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey],
  );

  const isUnread = useCallback(
    (conversationId: string, lastMessageAt?: string, lastMessageSender?: string) => {
      if (!lastMessageAt || lastMessageSender === userId) return false;
      const seenAt = lastRead[conversationId];
      if (!seenAt) return true;
      return new Date(lastMessageAt).getTime() > new Date(seenAt).getTime();
    },
    [lastRead, userId],
  );

  return { isUnread, markRead };
}
