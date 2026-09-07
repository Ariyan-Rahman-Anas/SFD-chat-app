"use client";

import { useState } from "react";
import { LogOut, MessageSquarePlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { ConversationRow } from "./ConversationRow";
import { NewChatDialog } from "./NewChatDialog";
import { cn } from "@/lib/utils";
import type { Conversation, User } from "@/lib/types";

export function Sidebar({
  currentUser,
  conversations,
  selectedId,
  isLoading,
  error,
  isUnread,
  onSelect,
  onStartDirect,
  onGroupCreated,
  onRetry,
  onLogout,
}: {
  currentUser: User;
  conversations: Conversation[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;
  isUnread: (conversation: Conversation) => boolean;
  onSelect: (conversation: Conversation) => void;
  onStartDirect: (userId: string) => Promise<void>;
  onGroupCreated: () => Promise<void>;
  onRetry: () => void;
  onLogout: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleStartDirect(userId: string) {
    await onStartDirect(userId);
    setDialogOpen(false);
  }

  async function handleGroupCreated() {
    await onGroupCreated();
    setDialogOpen(false);
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-neutral-200 bg-white md:w-80 md:shrink-0">
      <div className="flex items-center gap-3 border-b border-neutral-200 p-4">
        <Avatar name={currentUser.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">
            {currentUser.name}
          </p>
          <p className="truncate text-xs text-neutral-400">{currentUser.phone}</p>
        </div>
        <button
          onClick={onLogout}
          title="Log out"
          className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={() => setDialogOpen(true)}
        className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 py-2.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50"
      >
        <MessageSquarePlus className="h-4 w-4" />
        New conversation
      </button>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {!isLoading && error && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={onRetry}
              className="mt-3 rounded-full border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-neutral-500">
              No conversations yet
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Start one with the button above.
            </p>
          </div>
        )}

        {!isLoading &&
          conversations.map((c) => (
            <div key={c._id} className={cn("mb-0.5")}>
              <ConversationRow
                conversation={c}
                isSelected={c._id === selectedId}
                isUnread={isUnread(c)}
                onClick={() => onSelect(c)}
              />
            </div>
          ))}
      </div>

      {dialogOpen && (
        <NewChatDialog
          currentUserId={currentUser._id}
          onClose={() => setDialogOpen(false)}
          onStartDirect={handleStartDirect}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </aside>
  );
}
