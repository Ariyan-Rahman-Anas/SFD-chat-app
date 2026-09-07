import type {
  ConversationListResponse,
  MessageHistoryResponse,
  RawConversation,
  Conversation,
  Message,
  User,
} from "./types";

export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL ?? "https://frontend-task-chatapp.onrender.com";
const API_BASE = `${API_ORIGIN}/api`;

export class ApiError extends Error {
  code: string;
  status: number;
  details?: { path: string; message: string }[];

  constructor(
    message: string,
    code: string,
    status: number,
    details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const errBody = body as { error?: { message?: string; code?: string; details?: { path: string; message: string }[] } } | null;
    throw new ApiError(
      errBody?.error?.message ?? `Request failed with status ${res.status}`,
      errBody?.error?.code ?? "UNKNOWN_ERROR",
      res.status,
      errBody?.error?.details,
    );
  }

  return body as T;
}

export const api = {
  login: (phone: string, name: string) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, name }),
    }),

  me: () => request<User>("/auth/me"),

  searchUsers: (q: string) =>
    request<User[]>(`/users/search?q=${encodeURIComponent(q)}`),

  listConversations: () =>
    request<ConversationListResponse>("/conversations"),

  startConversation: (userId: string) =>
    request<RawConversation>("/conversations", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  createGroup: (name: string, participantIds: string[]) =>
    request<Conversation>("/conversations/group", {
      method: "POST",
      body: JSON.stringify({ name, participantIds }),
    }),

  getMessages: (conversationId: string, opts?: { limit?: number; before?: string }) => {
    const params = new URLSearchParams();
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.before) params.set("before", opts.before);
    const qs = params.toString();
    return request<MessageHistoryResponse>(
      `/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`,
    );
  },

  sendMessage: (conversationId: string, text: string) =>
    request<Message>("/messages", {
      method: "POST",
      body: JSON.stringify({ conversationId, text }),
    }),

  addParticipants: (conversationId: string, userIds: string[]) =>
    request<Conversation>(`/conversations/${conversationId}/participants`, {
      method: "POST",
      body: JSON.stringify({ userIds }),
    }),

  removeParticipant: (conversationId: string, userId: string) =>
    request<Conversation>(
      `/conversations/${conversationId}/participants/${userId}`,
      { method: "DELETE" },
    ),

  promoteAdmin: (conversationId: string, userId: string) =>
    request<Conversation>(`/conversations/${conversationId}/admins`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  renameGroup: (conversationId: string, name: string) =>
    request<Conversation>(`/conversations/${conversationId}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
};
