import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionResponse, SessionUser, UpdateProfileInput } from "@/lib/contracts";
import { ApiClientError, api, getErrorMessage } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

type AuthActionResult = {
  error?: string;
  code?: string;
  email?: string;
  message?: string;
};

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signInWithGoogle: () => void;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthActionResult>;
  resendVerificationEmail: (email: string) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  resetPassword: (token: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  updateProfile: (updates: UpdateProfileInput) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    retry: false,
    queryFn: () => api.getSession(),
  });

  const setSession = async (session: SessionResponse) => {
    queryClient.setQueryData(queryKeys.session, session);
    await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
  };

  const signIn = async (email: string, password: string) => {
    try {
      const session = await api.login(email, password);
      await setSession(session);
      return {};
    } catch (error) {
      return {
        error: getErrorMessage(error),
        code: error instanceof ApiClientError ? error.code : undefined,
        email: error instanceof ApiClientError && typeof error.details?.email === "string" ? error.details.email : undefined,
      };
    }
  };

  const signInWithGoogle = () => {
    window.location.assign(api.getGoogleAuthUrl());
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await api.register(email, password, fullName);
      return {
        code: "EMAIL_VERIFICATION_REQUIRED",
        email: response.email,
        message: response.message,
      };
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const response = await api.resendVerificationEmail(email);
      return {
        email: response.email ?? email,
        message: response.message,
      };
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const response = await api.forgotPassword(email);
      return {
        email: response.email ?? email,
        message: response.message,
      };
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      const response = await api.resetPassword(token, password);
      return {
        message: response.message,
      };
    } catch (error) {
      return {
        error: getErrorMessage(error),
        code: error instanceof ApiClientError ? error.code : undefined,
      };
    }
  };

  const signOut = async () => {
    const session = await api.logout();
    queryClient.setQueryData(queryKeys.session, session);
    queryClient.removeQueries({ queryKey: queryKeys.adminStats });
    queryClient.removeQueries({ queryKey: queryKeys.adminUsers });
    queryClient.removeQueries({ queryKey: queryKeys.groups });
    queryClient.removeQueries({ queryKey: ["inventory"] });
    queryClient.removeQueries({ queryKey: ["meal-recommendations"] });
  };

  const updateProfile = async (updates: UpdateProfileInput) => {
    try {
      const session = await api.updateProfile(updates);
      await setSession(session);
      return {};
    } catch (error) {
      return { error: getErrorMessage(error) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: sessionQuery.data?.user ?? null,
        loading: sessionQuery.isLoading,
        signIn,
        signInWithGoogle,
        signUp,
        resendVerificationEmail,
        requestPasswordReset,
        resetPassword,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
