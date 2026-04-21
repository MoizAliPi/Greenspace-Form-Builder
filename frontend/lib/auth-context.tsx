"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/api";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/auth-storage";
import type { TokenResponse, UserRead } from "@/types/api";

type AuthContextValue = {
  user: UserRead | null;
  token: string | null;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserRead | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const hydrateFromStorage = useCallback(async (t: string | null) => {
    if (!t) {
      setUser(null);
      setTokenState(null);
      return;
    }
    setTokenState(t);
    try {
      const me = await apiFetch<UserRead>("/auth/me");
      setUser(me);
    } catch {
      clearAccessToken();
      setTokenState(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const t = getAccessToken();
    void hydrateFromStorage(t).finally(() => setIsInitialized(true));
  }, [hydrateFromStorage]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      skipAuth: true,
      body: { email, password },
    });
    setAccessToken(res.access_token);
    await hydrateFromStorage(res.access_token);
  }, [hydrateFromStorage]);

  const register = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<TokenResponse>("/auth/register", {
      method: "POST",
      skipAuth: true,
      body: { email, password },
    });
    setAccessToken(res.access_token);
    await hydrateFromStorage(res.access_token);
  }, [hydrateFromStorage]);

  const logout = useCallback(() => {
    clearAccessToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isInitialized,
      login,
      register,
      logout,
    }),
    [user, token, isInitialized, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
