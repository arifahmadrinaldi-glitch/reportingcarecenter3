import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export const ADMIN_PASSWORD = "784521";
export const LOCK_PASSWORD = "CC32026";

const ROLE_KEY = "app-role";
const LOCK_KEY = "app-locked";

type Role = "user" | "admin";

type AccessContextValue = {
  role: Role;
  isAdmin: boolean;
  locked: boolean;
  ready: boolean;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  lockApp: () => void;
  unlockApp: (password: string) => boolean;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("user");
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(ROLE_KEY) === "admin") setRole("admin");
      if (localStorage.getItem(LOCK_KEY) === "1") setLocked(true);
    } catch {
      // ignore unavailable storage
    }
    setReady(true);
  }, []);

  const loginAdmin = useCallback((password: string) => {
    if (password.trim() !== ADMIN_PASSWORD) return false;
    setRole("admin");
    try {
      localStorage.setItem(ROLE_KEY, "admin");
    } catch {
      // ignore
    }
    return true;
  }, []);

  const logoutAdmin = useCallback(() => {
    setRole("user");
    try {
      localStorage.removeItem(ROLE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const lockApp = useCallback(() => {
    setLocked(true);
    try {
      localStorage.setItem(LOCK_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const unlockApp = useCallback((password: string) => {
    if (password.trim() !== LOCK_PASSWORD) return false;
    setLocked(false);
    try {
      localStorage.removeItem(LOCK_KEY);
    } catch {
      // ignore
    }
    return true;
  }, []);

  const value = useMemo(
    () => ({
      role,
      isAdmin: role === "admin",
      locked,
      ready,
      loginAdmin,
      logoutAdmin,
      lockApp,
      unlockApp,
    }),
    [role, locked, ready, loginAdmin, logoutAdmin, lockApp, unlockApp],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess harus dipakai di dalam AccessProvider");
  return ctx;
}
