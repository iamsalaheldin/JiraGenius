"use client";

import { useEffect, ReactNode } from "react";
import { useAuthStore } from "@/store/auth-store";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const validateSession = useAuthStore((state) => state.validateSession);

  useEffect(() => {
    // Validate session on mount
    validateSession();
  }, [validateSession]);

  return <>{children}</>;
}

