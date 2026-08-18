import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Clock3, Home, Loader2, LogOut, ShieldCheck, Store } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { MODULES, isSuperAdmin, ROLE_DEFINITIONS } from "../config/access";
import { useAuth } from "../hooks/useAuth";
import { waitForPendingBranchRequests } from "../services/dataSync";
import { GMT_PLUS_2_TIME_ZONE } from "../utils/time";

// Upper bound on how long the "switching branch" overlay can stay up. The
// overlay normally clears via waitForPendingBranchRequests() below (a real
// signal driven by in-flight branch-scoped fetches, tracked centrally in
// dataSync.ts) — this timeout only protects against a hung/never-resolving
// request or a page that doesn't refetch, so the UI can never get stuck.
const BRANCH_SWITCH_MAX_WAIT_MS = 4000;
// Lets appDataChanged listeners actually call fetch() before we start waiting
// on them — otherwise waitForPendingBranchRequests() can resolve immediately
// against zero in-flight requests.
const BRANCH_SWITCH_LISTENER_TICK_MS = 30;

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
  const { token, user, clearAuth, activeBranchId, setActiveBranchId } = useAuth();
  const location = useLocation();
  const [clock, setClock] = useState(() => new Date());
  const [branchSwitching, setBranchSwitching] = useState(false);
  // Identifies the in-progress switch so a superseded call (user re-toggled
  // before the first switch finished) never fires its overlay-hide/toast after
  // a later switch has already taken over — the final branch always wins.
  const switchTokenRef = useRef(0);
  const mountedRef = useRef(true);
  const superAdmin = isSuperAdmin(user);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleBranchChange = async (nextBranch: "butembo" | "beni") => {
    if (nextBranch === activeBranchId) return;
    const myToken = ++switchTokenRef.current;
    setBranchSwitching(true);
    setActiveBranchId(nextBranch);

    await new Promise((resolve) => window.setTimeout(resolve, BRANCH_SWITCH_LISTENER_TICK_MS));
    await Promise.race([
      waitForPendingBranchRequests(),
      new Promise((resolve) => window.setTimeout(resolve, BRANCH_SWITCH_MAX_WAIT_MS)),
    ]);

    if (!mountedRef.current || switchTokenRef.current !== myToken) return; // superseded by a newer switch
    setBranchSwitching(false);
    const label = nextBranch === "beni" ? "Beni" : "Butembo";
    toast.success(`Agence ${label} active`);
  };
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

            <label className="flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-2.5 text-sm font-bold text-blue-800">
              <Building2 className="h-4 w-4 shrink-0" />
              {superAdmin ? (
                <select
                  aria-label="Agence active"
                  value={activeBranchId}
                  disabled={branchSwitching}
                  onChange={(event) => handleBranchChange(event.target.value as "butembo" | "beni")}
                  className="max-w-24 bg-transparent text-sm font-bold outline-none disabled:opacity-60 sm:max-w-none"
                >
                  <option value="butembo">Butembo</option>
                  <option value="beni">Beni</option>
                </select>
              ) : (
                <span className="hidden sm:inline">{branchName}</span>
              )}
            </label>

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
        {branchSwitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-2xl">
              <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
              <span className="text-sm font-bold text-slate-900">
                Passage à {activeBranchId === "beni" ? "Beni" : "Butembo"}...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
