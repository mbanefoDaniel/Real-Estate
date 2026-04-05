"use client";

import { createContext, useContext, useMemo } from "react";

type SessionUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  name?: string | null;
};

const AuthContext = createContext<SessionUser | null>(null);

export function AuthProvider({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => user, [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
