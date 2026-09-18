import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export const ADMIN_PASSWORD = "784521";
const ROLE_KEY = "app-role";

type Role = "user" | "admin";

type AccessContextValue = {
  role: Role;
  isAdmin: boolean;
  loginAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("user");

  useEffect(() => {
    try {
      if (localStorage.getItem(ROLE_KEY) === "admin") setRole("admin");
    } catch {
      // ignore unavailable storage
    }
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

  const value = useMemo(
    () => ({
      role,
      isAdmin: role === "admin",
      loginAdmin,
      logoutAdmin,
    }),
    [role, loginAdmin, logoutAdmin],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess harus dipakai di dalam AccessProvider");
  return ctx;
}
