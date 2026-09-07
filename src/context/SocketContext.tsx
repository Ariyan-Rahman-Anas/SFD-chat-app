"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { useAuth } from "./AuthContext";

type ConnectionState = "idle" | "connecting" | "connected" | "disconnected";

const SocketContext = createContext<{
  socket: Socket | null;
  status: ConnectionState;
}>({ socket: null, status: "idle" });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionState>("idle");

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      setStatus("idle");
      return;
    }

    setStatus("connecting");
    const s = connectSocket(token);
    setSocket(s);

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onDisconnect);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onDisconnect);
      disconnectSocket();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, status }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
