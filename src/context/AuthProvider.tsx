"use client";
import * as React from "react";
import type { AuthState, BranchId, User } from "../types/auth";
import { AuthContext } from "./auth-context";

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
    const assignedBranch = user?.branchId || "butembo";
    const storedBranch = localStorage.getItem("activeBranchId") as BranchId | null;
    const canSwitch = user?.role === "admin" || user?.role === "superadmin" || user?.isSuperAdmin;
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

      const assignedBranch = user?.branchId || "butembo";
      const canSwitch = user?.role === "admin" || user?.role === "superadmin" || user?.isSuperAdmin;
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

  const setActiveBranchId = React.useCallback((branchId: BranchId) => {
    if (branchId !== "butembo" && branchId !== "beni") return;
    setState((current) => {
      const canSwitch = current.user?.role === "admin" || current.user?.role === "superadmin" || current.user?.isSuperAdmin;
      const nextBranch = canSwitch ? branchId : current.user?.branchId || "butembo";
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
