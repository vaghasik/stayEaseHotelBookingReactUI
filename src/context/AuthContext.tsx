import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import * as api from "../services/api";
import { clearSearchPrefs } from "../utils/searchPrefs";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "stayease.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // A new person is signing in on this browser - drop any search remembered
    // from a previous session so it doesn't leak across users.
    clearSearchPrefs();
    // Let any error (e.g. ApiException("Invalid credentials")) propagate to
    // the caller as-is, so the login page can show the backend's real
    // message. There is deliberately no "fall back to a cached session on
    // failure" path here anymore - that used to mean a wrong password could
    // silently log you in as whoever was last cached in localStorage.
    const loggedIn = await api.login(email, password);
    setUser(loggedIn);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedIn));
  };

  const register = async (email: string, password: string, name: string) => {
    clearSearchPrefs();
    const created = await api.register(email, password, name);
    setUser(created);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEY);
    // Drop the remembered search so the next person on this browser starts
    // clean and doesn't inherit this user's city/dates.
    clearSearchPrefs();
    // clear token if backend issued one
    try {
      api.clearAuthToken();
    } catch {}
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
