import { create } from "zustand";
import { persist } from "zustand/middleware";
import { JiraAuth } from "@/lib/schemas";
import { validateAuth } from "@/lib/jira-client";

interface AuthState {
  isAuthenticated: boolean;
  credentials: JiraAuth | null;
  user: any | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: JiraAuth) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  validateSession: () => Promise<boolean>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      isAuthenticated: false,
      credentials: null,
      user: null,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: JiraAuth) => {
        set({ isLoading: true, error: null });

        try {
          const result = await validateAuth(
            credentials.baseUrl,
            credentials.email,
            credentials.apiToken
          );

          if (result.valid) {
            set({
              isAuthenticated: true,
              credentials,
              user: result.user,
              isLoading: false,
              error: null,
            });
            return { success: true };
          } else {
            set({
              isAuthenticated: false,
              credentials: null,
              user: null,
              isLoading: false,
              error: result.error || "Authentication failed",
            });
            return { success: false, error: result.error };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          set({
            isAuthenticated: false,
            credentials: null,
            user: null,
            isLoading: false,
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          credentials: null,
          user: null,
          error: null,
        });
      },

      validateSession: async () => {
        const { credentials } = get();
        
        if (!credentials) {
          set({ isAuthenticated: false });
          return false;
        }

        try {
          const result = await validateAuth(
            credentials.baseUrl,
            credentials.email,
            credentials.apiToken
          );

          if (result.valid) {
            set({ isAuthenticated: true, user: result.user });
            return true;
          } else {
            set({ isAuthenticated: false, credentials: null, user: null });
            return false;
          }
        } catch (error) {
          set({ isAuthenticated: false, credentials: null, user: null });
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "jira-auth-storage",
      partialize: (state) => ({
        credentials: state.credentials,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

