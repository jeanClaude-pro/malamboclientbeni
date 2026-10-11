import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-toastify";
import { canAccessPath } from "../config/access";

export const RequireAuth: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { token, user, loading } = useAuth();
  const location = useLocation();

  // If not logged in, show toast once
  useEffect(() => {
    if (!loading && !token) {
      toast.error("You must be logged in to access this page.");
    }
  }, [loading, token]);

  if (loading) {
    return (
      <div className="flex min-h-[45dvh] items-center justify-center px-4" role="status" aria-live="polite">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" aria-hidden="true" />
        <span className="ml-3 text-sm font-semibold text-slate-600">Vérification de la session…</span>
      </div>
    );
  }
  if (!token)
    return <Navigate to="/login" replace state={{ from: location }} />;

  // The same matrix drives the landing cards and direct-URL protection.
  if (!canAccessPath(user, location.pathname)) return <Navigate to="/" replace />;

  return <>{children}</>;
};
