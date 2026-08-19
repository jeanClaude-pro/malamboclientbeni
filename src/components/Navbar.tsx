import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Building2, Clock3, Home, LogOut, ShieldCheck, Store } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MODULES, canSwitchBranch, isSuperAdmin, ROLE_DEFINITIONS } from "../config/access";
import { useAuth } from "../hooks/useAuth";
import { GMT_PLUS_2_TIME_ZONE } from "../utils/time";

function isRestrictedTime(): boolean {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: GMT_PLUS_2_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).format(now));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: GMT_PLUS_2_TIME_ZONE,
    weekday: "short",
  }).format(now);
  return weekday === "Sun" || hour < 7 || hour >= 20;
}

export default function Navbar() {
  const { token, user, clearAuth, activeBranchId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [clock, setClock] = useState(() => new Date());
  const superAdmin = isSuperAdmin(user);
  // Narrower than superAdmin: only superadmin may switch branches, and only
  // via the branch gateway (/workspace) — never directly from inside the app.
  const canSwitch = canSwitchBranch(user);
  const onWorkspacePage = location.pathname === "/workspace";

  const unrestrictedSchedule = superAdmin || user?.role === "manager";
  const restricted = Boolean(user && !unrestrictedSchedule && isRestrictedTime());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!restricted) return;
    const timer = window.setTimeout(() => {
      clearAuth();
      window.location.href = "/login?message=auto_logout";
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [clearAuth, restricted]);

  const currentModule = useMemo(
    () => MODULES.find((module) => module.path.toLowerCase() === location.pathname.toLowerCase()),
    [location.pathname]
  );

  if (!token || !user || location.pathname === "/login") return null;

  const branchName = activeBranchId === "beni" ? "Beni" : "Butembo";
  const formattedTime = clock.toLocaleTimeString("fr-FR", {
    timeZone: GMT_PLUS_2_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <header className="no-print sticky top-0 z-40 border-b border-white/70 bg-white/80 shadow-sm shadow-slate-200/50 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center gap-3 px-3 py-2 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
              <Store className="h-5 w-5" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-black uppercase tracking-wide text-slate-950">Entre Nous Renove</span>
              <span className="block truncate text-[11px] font-semibold text-slate-500">{currentModule?.label || "Accueil des modules"}</span>
            </span>
          </Link>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            {location.pathname !== "/" && (
              <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
                <Home className="h-4 w-4" /> <span className="hidden md:inline">Modules</span>
              </Link>
            )}

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 lg:flex">
              <Clock3 className="h-4 w-4 text-blue-600" /> {formattedTime}
            </div>

            <div className="flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-2.5 text-sm font-bold text-blue-800">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{branchName}</span>
              {canSwitch && !onWorkspacePage && (
                <button
                  type="button"
                  onClick={() => navigate("/workspace")}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-2 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Changer d'agence"
                >
                  <ArrowLeftRight className="h-3 w-3" />
                  <span className="hidden md:inline">Changer</span>
                </button>
              )}
            </div>

            <div className="hidden min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 md:flex">
              <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600" />
              <span className="min-w-0">
                <span className="block max-w-28 truncate text-xs font-bold text-slate-900">{user.username}</span>
                <span className="block max-w-28 truncate text-[10px] font-semibold text-slate-500">{ROLE_DEFINITIONS[user.role].label}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                clearAuth();
                window.location.href = "/login";
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {restricted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="no-print fixed inset-x-3 top-20 z-50 mx-auto max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center text-sm font-semibold text-amber-900 shadow-xl"
          >
            Accès hors horaire autorisé. Déconnexion automatique dans quelques secondes.
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
