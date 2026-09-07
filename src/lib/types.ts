export interface User {
  _id: string;
  name: string;
  phone: string;
  createdAt?: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: string;
}

/**
 * The `message:new` socket event has a different shape than the REST API:
 * `id` instead of `_id`, and `createdAt` as an epoch-ms number instead of
 * an ISO string. See lib/socket.ts#normalizeSocketMessage.
 */
export interface SocketMessage {
  id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: number;
}

export interface MessageHistoryResponse {
  messages: Message[];
  hasMore: boolean;
}

interface ConversationBase {
  _id: string;
  updatedAt: string;
  lastMessage?: {
    text?: string;
    sender?: string;
    createdAt?: string;
  };
}

export interface DirectConversation extends ConversationBase {
  type: "direct";
  participant: User;
}

export interface GroupConversation extends ConversationBase {
  type: "group";
  name: string;
  createdBy: string;
  admins: string[];
  participants: User[];
}

export type Conversation = DirectConversation | GroupConversation;

export interface ConversationListResponse {
  data: Conversation[];
}

/**
 * Shape returned by POST /conversations (start direct chat). Unlike the list
 * endpoint, this one does NOT populate participants — only raw user ids.
 */
export interface RawConversation {
  _id: string;
  participants: string[];
  createdAt: string;
}

export interface ApiErrorBody {
  error: {
    message: string;
    code: string;
    details?: { path: string; message: string }[];
  };
}
