"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Users, X, ArrowLeft, Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types";

export function NewChatDialog({
  currentUserId,
  onClose,
  onStartDirect,
  onGroupCreated,
}: {
  currentUserId: string;
  onClose: () => void;
  onStartDirect: (userId: string) => Promise<void>;
  onGroupCreated: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"pick" | "group">("pick");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Map<string, User>>(new Map());
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const users = await api.searchUsers(query.trim());
        // The API only prefix-matches, so also apply a client-side
        // substring filter to catch matches like "Test User B" for "User B".
        const q = query.trim().toLowerCase();
        const filtered = users.filter(
          (u) =>
            u._id !== currentUserId &&
            (u.name.toLowerCase().includes(q) || u.phone.includes(q)),
        );
        setResults(filtered);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, currentUserId]);

  async function handlePick(user: User) {
    if (mode === "group") {
      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(user._id)) next.delete(user._id);
        else next.set(user._id, user);
        return next;
      });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onStartDirect(user._id);
    } catch {
      setError("Couldn't start that conversation. Please try again.");
      setBusy(false);
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim() || selected.size < 2) return;
    setBusy(true);
    setError(null);
    try {
      await api.createGroup(groupName.trim(), Array.from(selected.keys()));
      await onGroupCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the group.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="new-chat-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="flex max-h-128 w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-neutral-200 p-4">
          {mode === "group" && (
            <button
              onClick={() => setMode("pick")}
              className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h2 className="flex-1 text-sm font-semibold text-neutral-900">
            {mode === "group" ? "New group" : "New conversation"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {mode === "pick" && (
          <button
            onClick={() => setMode("group")}
            className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-white">
              <Users className="h-4 w-4" />
            </span>
            Create a group
          </button>
        )}

        {mode === "group" && (
          <div className="border-b border-neutral-200 p-4">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
            {selected.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from(selected.values()).map((u) => (
                  <span
                    key={u._id}
                    className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700"
                  >
                    {u.name}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-neutral-400">
              Pick at least 2 people to add (a group needs 3+ members total).
            </p>
          </div>
        )}

        <div className="border-b border-neutral-200 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or phone"
              className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {searching && (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p className="py-6 text-center text-sm text-neutral-400">
              No one found for &ldquo;{query}&rdquo;
            </p>
          )}
          {!searching &&
            results.map((u) => {
              const isSelected = selected.has(u._id);
              return (
                <button
                  key={u._id}
                  onClick={() => handlePick(u)}
                  disabled={busy}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-neutral-50 disabled:opacity-50"
                >
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {u.name}
                    </p>
                    <p className="truncate text-xs text-neutral-400">{u.phone}</p>
                  </div>
                  {mode === "group" && (
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border",
                        isSelected
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        {error && (
          <p className="border-t border-neutral-200 px-4 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {mode === "group" && (
          <div className="border-t border-neutral-200 p-3">
            <button
              onClick={handleCreateGroup}
              disabled={busy || !groupName.trim() || selected.size < 2}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
            >
              {busy && <Spinner className="h-4 w-4 border-white/30 border-t-white" />}
              Create group
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
