"use client";

import { useState, type KeyboardEvent } from "react";
import { SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = text.trim().length > 0 && !sending && !disabled;

  async function handleSend() {
    if (!canSend) return;
    const value = text.trim();
    setSending(true);
    setError(null);
    setText("");
    try {
      await onSend(value);
    } catch {
      setText(value);
      setError("Message didn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-neutral-200 bg-white">
      {error && (
        <p className="px-3 pt-2 text-xs text-red-500">{error}</p>
      )}
      <div className="flex items-end gap-2 p-3">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
          disabled={disabled}
          className="max-h-32 flex-1 resize-none rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:bg-neutral-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
            canSend
              ? "bg-neutral-900 text-white hover:bg-neutral-800"
              : "bg-neutral-100 text-neutral-300",
          )}
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
