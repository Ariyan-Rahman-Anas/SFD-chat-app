import { io, type Socket } from "socket.io-client";
import { API_ORIGIN } from "./api";
import type { Message, SocketMessage } from "./types";

/**
 * Normalizes a `message:new` socket payload into the same shape the REST
 * API uses (`_id` + ISO `createdAt`), so the rest of the app only ever
 * deals with one Message shape.
 */
export function normalizeSocketMessage(raw: SocketMessage): Message {
  return {
    _id: raw.id,
    conversation: raw.conversation,
    sender: raw.sender,
    text: raw.text,
    createdAt: new Date(raw.createdAt).toISOString(),
  };
}

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }
  socket = io(API_ORIGIN, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
