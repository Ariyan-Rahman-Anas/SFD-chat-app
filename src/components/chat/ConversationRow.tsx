import { Avatar } from "@/components/ui/Avatar";
import { cn, formatConversationTimestamp } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

export function ConversationRow({
  conversation,
  isSelected,
  isUnread,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  isUnread: boolean;
  onClick: () => void;
}) {
  const title =
    conversation.type === "group" ? conversation.name : conversation.participant.name;
  const preview = conversation.lastMessage?.text?.trim()
    ? conversation.lastMessage.text
    : "No messages yet";
  const timestamp = conversation.lastMessage?.createdAt ?? conversation.updatedAt;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
        isSelected ? "bg-neutral-900 text-white" : "hover:bg-neutral-100",
      )}
    >
      <Avatar name={title} isGroup={conversation.type === "group"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              isSelected ? "text-white" : "text-neutral-900",
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "shrink-0 text-xs",
              isSelected ? "text-neutral-300" : "text-neutral-400",
            )}
          >
            {formatConversationTimestamp(timestamp)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-xs",
              isSelected ? "text-neutral-300" : "text-neutral-500",
            )}
          >
            {preview}
          </span>
          {isUnread && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          )}
        </div>
      </div>
    </button>
  );
}
