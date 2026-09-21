"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type User = {
  id: string;
  username: string;
  email: string;
  displayName: string;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (
    username: string,
    email: string,
    displayName: string,
    password: string,
    confirmPassword: string,
    birthDate: string,
    termsAccepted: boolean,
    privacyAccepted: boolean,
    operationPolicyAccepted: boolean,
    ageConfirmed: boolean,
    marketingAccepted: boolean,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = (await response.json()) as { success: boolean; user?: User };
        setUser(data.success && data.user ? data.user : null);
      } catch {
        setUser(null);
      } finally {
        setIsReady(true);
      }
    }

    void loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as { success?: boolean; error?: string; user?: User };

      if (!response.ok || !data.success || !data.user) {
        return false;
      }

      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const signup = async (
    username: string,
    email: string,
    displayName: string,
    password: string,
    confirmPassword: string,
    birthDate: string,
    termsAccepted: boolean,
    privacyAccepted: boolean,
    operationPolicyAccepted: boolean,
    ageConfirmed: boolean,
    marketingAccepted: boolean,
  ) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username,
          email,
          displayName,
          password,
          confirmPassword,
          birthDate,
          termsAccepted,
          privacyAccepted,
          operationPolicyAccepted,
          ageConfirmed,
          marketingAccepted,
        }),
      });

      const data = (await response.json()) as { success?: boolean; user?: User; error?: string };

      if (!response.ok || !data.success || !data.user) {
        return false;
      }

      setUser(data.user);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
