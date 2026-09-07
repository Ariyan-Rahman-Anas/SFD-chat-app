import { cn, formatMessageTime } from "@/lib/utils";
import type { Message } from "@/lib/types";

export function MessageBubble({
  message,
  isOwn,
  senderName,
  pending,
}: {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  pending?: boolean;
}) {
  const isEmpty = !message.text.trim();

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm animate-fade-in-up",
          isOwn
            ? "rounded-br-sm bg-neutral-900 text-white"
            : "rounded-bl-sm bg-white text-neutral-900 ring-1 ring-neutral-200",
          pending && "opacity-60",
        )}
      >
        {senderName && !isOwn && (
          <p className="mb-0.5 text-xs font-semibold text-emerald-600">
            {senderName}
          </p>
        )}
        <p className={cn("whitespace-pre-wrap break-words", isEmpty && "italic opacity-60")}>
          {isEmpty ? "(empty message)" : message.text}
        </p>
        <p
          className={cn(
            "mt-0.5 text-right text-[10px]",
            isOwn ? "text-neutral-400" : "text-neutral-400",
          )}
        >
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
