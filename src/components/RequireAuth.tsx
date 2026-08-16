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

  if (loading) return null; // or a spinner
  if (!token)
    return <Navigate to="/login" replace state={{ from: location }} />;

  // The same matrix drives the landing cards and direct-URL protection.
  if (!canAccessPath(user, location.pathname)) return <Navigate to="/" replace />;

  return <>{children}</>;
};
