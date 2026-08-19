"use client";
import * as React from "react";
import type { AuthState, BranchId, User } from "../types/auth";
import { AuthContext } from "./auth-context";
import { canSwitchBranch } from "../config/access";
import { AUTH_TOKEN_REFRESHED_EVENT, AUTH_LOGGED_OUT_EVENT } from "../services/dataSync";

export const AuthProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [state, setState] = React.useState<AuthState>({
    token: null,
    user: null,
    loading: true,
    activeBranchId: "butembo",
  });

  // Boot from localStorage
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (!token) {
      setState({ token: null, user: null, loading: false, activeBranchId: "butembo" });
      return;
    }

    const user: User | null = userRaw ? JSON.parse(userRaw) : null;
    const assignedBranch: BranchId = user?.branchId || "butembo";
    const storedBranch = localStorage.getItem("activeBranchId") as BranchId | null;
    const canSwitch = canSwitchBranch(user);
    const activeBranchId = canSwitch && (storedBranch === "butembo" || storedBranch === "beni")
      ? storedBranch
      : assignedBranch;
    localStorage.setItem("activeBranchId", activeBranchId);
    setState({ token, user, loading: false, activeBranchId });
  }, []);

  const setAuth = React.useCallback(
    ({ token, user }: { token: string | null; user: User | null }) => {
      if (token) localStorage.setItem("token", token);
      else localStorage.removeItem("token");

      if (user) localStorage.setItem("user", JSON.stringify(user));
      else localStorage.removeItem("user");

      const assignedBranch: BranchId = user?.branchId || "butembo";
      const canSwitch = canSwitchBranch(user);
      const storedBranch = localStorage.getItem("activeBranchId") as BranchId | null;
      const activeBranchId = canSwitch && (storedBranch === "butembo" || storedBranch === "beni")
        ? storedBranch
        : assignedBranch;
      localStorage.setItem("activeBranchId", activeBranchId);
      setState((s) => ({ ...s, token, user, activeBranchId }));
    },
    []
  );

  const clearAuth = React.useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeBranchId");
    setState({ token: null, user: null, loading: false, activeBranchId: "butembo" });
  }, []);

  // The global fetch interceptor (services/dataSync.ts) is the one place that
  // actually sees every response, so it owns writing to localStorage on a
  // silent token refresh or a 401. These listeners keep this context's React
  // state (what RequireAuth/Navbar/pages actually read) from drifting out of
  // sync with that — without them the app can keep rendering as "logged out"
  // or hold a now-invalid token in memory until the next full page reload.
  React.useEffect(() => {
    const handleRefreshed = (event: Event) => {
      const token = (event as CustomEvent<{ token: string }>).detail?.token;
      if (token) setState((s) => ({ ...s, token }));
    };
    const handleLoggedOut = () => clearAuth();

    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, handleRefreshed);
    window.addEventListener(AUTH_LOGGED_OUT_EVENT, handleLoggedOut);
    return () => {
      window.removeEventListener(AUTH_TOKEN_REFRESHED_EVENT, handleRefreshed);
      window.removeEventListener(AUTH_LOGGED_OUT_EVENT, handleLoggedOut);
    };
  }, [clearAuth]);

  const setActiveBranchId = React.useCallback((branchId: BranchId) => {
    if (branchId !== "butembo" && branchId !== "beni") return;
    setState((current) => {
      const canSwitch = canSwitchBranch(current.user);
      const nextBranch: BranchId = canSwitch ? branchId : current.user?.branchId || "butembo";
      localStorage.setItem("activeBranchId", nextBranch);
      window.dispatchEvent(new CustomEvent("branchChanged", { detail: { branchId: nextBranch } }));
      window.dispatchEvent(new CustomEvent("appDataChanged", { detail: { branchId: nextBranch } }));
      return { ...current, activeBranchId: nextBranch };
    });
  }, []);

  const value = { ...state, setAuth, clearAuth, setActiveBranchId };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
