"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setAuthToken } from "@/lib/api";
import type { User } from "@/lib/types";

const STORAGE_KEY = "chat_app_session";

interface StoredSession {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (phone: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null) {
  if (typeof window === "undefined") return;
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Deliberately NOT read from localStorage in these initial values. This
  // component renders on the server first (where there's no localStorage),
  // then hydrates on the client — if the client's first render produced a
  // different result than the server's, React would throw a hydration
  // mismatch. Starting every render at the same "unknown yet" state and
  // only reading localStorage inside an effect (which only ever runs on
  // the client, after hydration) keeps server and client in sync.
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setIsLoading(false);
      return;
    }
    setAuthToken(session.token);
    setToken(session.token);
    setUser(session.user);
    // Verify the restored token still works; log out silently if it doesn't.
    api
      .me()
      .then((fresh) => setUser(fresh))
      .catch(() => {
        setAuthToken(null);
        setToken(null);
        setUser(null);
        writeSession(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (phone: string, name: string) => {
    const res = await api.login(phone, name);
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
    writeSession({ token: res.token, user: res.user });
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    writeSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
