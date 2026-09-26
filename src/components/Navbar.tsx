import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ArrowLeftRight, Clock3, Home, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MODULES, canSwitchBranch, isSuperAdmin, ROLE_DEFINITIONS } from "../config/access";
import { useAuth } from "../hooks/useAuth";
import { initials } from "../utils/initials";
import { GMT_PLUS_2_TIME_ZONE } from "../utils/time";
import ModuleNavigation from "./ModuleNavigation";

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
  const header = useRef<HTMLElement>(null);
  // Path the header was condensed on; navigating anywhere else resets it.
  const [condensedPath, setCondensedPath] = useState<string | null>(null);
  const superAdmin = isSuperAdmin(user);
  // Narrower than superAdmin: only superadmin may switch branches, and only
  // via the branch gateway (/workspace) — never directly from inside the app.
  const canSwitch = canSwitchBranch(user);
  const onWorkspacePage = location.pathname === "/workspace";
  const shown = Boolean(token && user && location.pathname !== "/login");
  const condensed = condensedPath === location.pathname;

  const unrestrictedSchedule = superAdmin || user?.role === "manager";
  const restricted = Boolean(user && !unrestrictedSchedule && isRestrictedTime());

  // Tick on the minute boundary so the clock never lags by up to a minute.
  useEffect(() => {
    let interval = 0;
    const tick = () => setClock(new Date());
    const timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!restricted) return;
    const timer = window.setTimeout(() => {
      clearAuth();
      window.location.href = "/login?message=auto_logout";
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [clearAuth, restricted]);

  // Publish the header's real height (for banners positioned below it) and how
  // far it slides up when condensed: the brand row only, so the module bar stays.
  useEffect(() => {
    const root = document.documentElement;
    const element = header.current;
    if (!shown || !element) {
      root.style.setProperty("--app-header-h", "0px");
      return;
    }
    const measure = () => {
      const rail = element.querySelector<HTMLElement>(".module-nav");
      root.style.setProperty("--app-header-h", `${element.offsetHeight}px`);
      element.style.setProperty("--app-header-hide", `${element.offsetHeight - (rail?.offsetHeight ?? 0)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown, onWorkspacePage]);

  // Slide the brand row away while scrolling down, bring it back on any scroll up.
  useEffect(() => {
    if (!shown) return;
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      if (y <= (header.current?.offsetHeight ?? 120)) {
        setCondensedPath(null);
        lastY = y;
        return;
      }
      if (Math.abs(y - lastY) < 8) return;
      setCondensedPath(y > lastY ? window.location.pathname : null);
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [shown]);

  const currentModule = useMemo(
    () => MODULES.find((module) => module.path.toLowerCase() === location.pathname.toLowerCase()),
    [location.pathname]
  );

  if (!shown || !user) return null;

  const branchName = activeBranchId === "beni" ? "Beni" : "Butembo";
  const formattedTime = clock.toLocaleTimeString("fr-FR", {
    timeZone: GMT_PLUS_2_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
  const pageLabel = currentModule?.label || (onWorkspacePage ? "Choix de l'agence" : "Accueil");
  const ModuleIcon = currentModule?.icon;

  return (
    <MotionConfig reducedMotion="user">
      <header ref={header} data-condensed={condensed} className="app-header no-print">
        <div className="app-topbar">
          <Link to="/" className="group flex min-w-0 items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 shadow-md shadow-slate-900/20 ring-1 ring-slate-900/10 transition group-hover:shadow-lg group-hover:shadow-blue-900/20 group-active:scale-95">
              <img src="/logorenove.png" alt="" className="h-full w-full object-contain" />
            </span>
            <span className="block min-w-0">
              <span className="block truncate text-xs font-black uppercase tracking-[.08em] text-slate-950 sm:text-sm">Entre Nous Renove</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={pageLabel}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.16 }}
                  className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-slate-500 sm:text-xs"
                >
                  {ModuleIcon && <ModuleIcon className="h-3 w-3 shrink-0 text-blue-600" />}
                  <span className="truncate">{pageLabel}</span>
                </motion.span>
              </AnimatePresence>
            </span>
          </Link>

          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
            {onWorkspacePage && (
              <Link to="/" className="desktop-app-only app-chip gap-2 px-3 text-slate-700 hover:border-blue-300 hover:text-blue-700">
                <Home className="h-4 w-4" /> <span className="hidden md:inline">Accueil</span>
              </Link>
            )}

            <div className="app-chip hidden gap-2 bg-slate-50/80 px-3 text-xs tabular-nums text-slate-600 lg:flex" title="Heure locale (GMT+2)">
              <Clock3 className="h-4 w-4 text-blue-600" /> {formattedTime}
            </div>

            <div className="app-chip gap-2 border-blue-200/80 bg-blue-50/80 pl-2.5 pr-1 text-blue-900" title={`Agence active : ${branchName}`}>
              <span className="app-branch-dot" data-branch={activeBranchId} aria-hidden="true" />
              <span className="pr-1.5 text-[13px]"><span className="sr-only">Agence </span>{branchName}</span>
              {canSwitch && !onWorkspacePage && (
                <button
                  type="button"
                  onClick={() => navigate("/workspace")}
                  className="compact-control desktop-app-only inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 text-[11px] font-black uppercase tracking-wide text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-100 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  title="Changer d'agence"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Changer</span>
                </button>
              )}
            </div>

            <div className="app-chip hidden min-w-0 gap-2.5 pl-1 pr-3 md:flex">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-[11px] font-black text-white shadow-sm" aria-hidden="true">
                {initials(user.username)}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block max-w-32 truncate text-xs font-bold text-slate-900">{user.username}</span>
                <span className="block max-w-32 truncate text-[10px] font-semibold text-slate-500">{ROLE_DEFINITIONS[user.role].label}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                clearAuth();
                window.location.href = "/login";
              }}
              className="desktop-app-only inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-md shadow-slate-900/20 transition hover:bg-rose-600 hover:shadow-rose-900/20 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {!onWorkspacePage && <ModuleNavigation />}
      </header>

      <AnimatePresence>
        {restricted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="no-print fixed inset-x-3 top-[calc(var(--app-header-h,4rem)+.75rem)] z-50 mx-auto max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center text-sm font-semibold text-amber-900 shadow-xl"
          >
            Accès hors horaire autorisé. Déconnexion automatique dans quelques secondes.
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
