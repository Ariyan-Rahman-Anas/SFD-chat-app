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
  // Restore any stored session synchronously on first render (rather than
  // via an effect) so there's no render where a logged-in user briefly
  // flashes the login page before the effect has a chance to run.
  const [user, setUser] = useState<User | null>(() => readSession()?.user ?? null);
  const [token, setToken] = useState<string | null>(() => {
    const t = readSession()?.token ?? null;
    setAuthToken(t);
    return t;
  });
  const [isLoading, setIsLoading] = useState(() => readSession() !== null);

  useEffect(() => {
    if (!token) return;
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
    // Only ever needs to run once, against whatever token was restored at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
