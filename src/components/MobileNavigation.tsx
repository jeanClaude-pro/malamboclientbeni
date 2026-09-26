import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useDragControls } from "framer-motion";
import { ArrowLeftRight, Home, LayoutGrid, LogOut, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MODULE_SECTIONS, canSwitchBranch, navigableModules, ROLE_DEFINITIONS } from "../config/access";
import { useAuth } from "../hooks/useAuth";
import { initials } from "../utils/initials";

const PILL_SPRING = { type: "spring", stiffness: 560, damping: 40, mass: 0.8 } as const;
const NON_TEXT_INPUTS = new Set(["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]);

// True while a text field has focus: the on-screen keyboard is up, and the tab
// bar would otherwise ride on top of it and cover the form being filled in.
function useTypingFocus() {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isTextField = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)));
    const onFocusIn = (event: FocusEvent) => setTyping(isTextField(event.target));
    const onFocusOut = (event: FocusEvent) => {
      if (!isTextField(event.relatedTarget)) setTyping(false);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);
  return typing;
}

export default function MobileNavigation() {
  const { token, user, activeBranchId, clearAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Keyed to the path so the sheet closes on any navigation, including the back button.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === location.pathname;
  const typing = useTypingFocus();
  const moreButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dragControls = useDragControls();
  const accessible = useMemo(() => navigableModules(user), [user]);

  const primary = useMemo(() => {
    const preferred = ["pos", "products", "transfert", "transfer-reception", "sales", "reports", "historicsortie"];
    return preferred.map((id) => accessible.find((item) => item.id === id)).filter(Boolean).slice(0, 3) as typeof accessible;
  }, [accessible]);
  const primaryIds = new Set(primary.map((item) => item.id));
  const additional = accessible.filter((item) => !primaryIds.has(item.id));

  const close = (restoreFocus = true) => {
    setOpenPath(null);
    if (restoreFocus) moreButton.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!open) return;
    // The page scrolls on <html> (index.css), so that is what gets locked.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenPath(null);
      moreButton.current?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      root.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!token || !user || location.pathname === "/login" || location.pathname === "/workspace") return null;

  const active = (path: string) => location.pathname.toLowerCase() === path.toLowerCase();
  const branchName = activeBranchId === "beni" ? "Beni" : "Butembo";
  const moreActive = open || (!active("/") && !primary.some((item) => active(item.path)));
  const tabs = [
    { id: "home", path: "/", label: "Accueil", icon: Home },
    ...primary.map((module) => ({ id: module.id, path: module.path, label: module.shortLabel ?? module.label, icon: module.icon })),
  ];
  const logout = () => {
    setOpenPath(null);
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-sheet"
            className="mobile-app-only mobile-sheet-overlay no-print"
            onClick={() => close()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.section
              id="mobile-sheet"
              className="mobile-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-sheet-title"
              onClick={(event) => event.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 600) close();
              }}
            >
              <div className="mobile-sheet-handle" onPointerDown={(event) => dragControls.start(event)}>
                <span className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-slate-300" aria-hidden="true" />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 id="mobile-sheet-title" className="text-xl font-black text-slate-950">Menu</h2>
                    <p className="text-xs font-medium text-slate-500">Modules, agence et compte</p>
                  </div>
                  <button ref={closeButton} type="button" onClick={() => close()} className="compact-control flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 active:scale-95" aria-label="Fermer">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mobile-sheet-body">
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-black text-white shadow-sm" aria-hidden="true">{initials(user.username)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-slate-950">{user.username}</p>
                      <p className="truncate text-xs font-semibold text-slate-500">{ROLE_DEFINITIONS[user.role].label}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-blue-50/80 px-3 py-2.5 ring-1 ring-blue-100">
                    <span className="app-branch-dot" data-branch={activeBranchId} aria-hidden="true" />
                    <p className="min-w-0 flex-1 text-sm font-bold text-blue-950"><span className="font-semibold text-blue-700/80">Agence</span> {branchName}</p>
                    {canSwitchBranch(user) && (
                      <button type="button" onClick={() => { close(false); navigate("/workspace"); }} className="compact-control inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-xs font-extrabold text-blue-800 shadow-sm active:scale-95">
                        <ArrowLeftRight className="h-3.5 w-3.5" /> Changer
                      </button>
                    )}
                  </div>
                </div>

                {MODULE_SECTIONS.map((section) => {
                  const items = additional.filter((module) => module.section === section);
                  if (!items.length) return null;
                  return (
                    <div key={section}>
                      <h3 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[.14em] text-slate-500">{section}</h3>
                      <div className="grid grid-cols-2 gap-2.5">
                        {items.map((module) => {
                          const Icon = module.icon;
                          const current = active(module.path);
                          return (
                            <Link
                              key={module.id}
                              to={module.path}
                              onClick={() => close(false)}
                              aria-current={current ? "page" : undefined}
                              className={`mobile-sheet-tile${current ? " mobile-sheet-tile-active" : ""}`}
                            >
                              <span className="mobile-sheet-tile-icon"><Icon className="h-[18px] w-[18px]" /></span>
                              <span className="text-[13px] font-extrabold leading-tight">{module.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <button type="button" onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-extrabold text-rose-700 shadow-sm active:scale-[.99] active:bg-rose-50">
                  <LogOut className="h-5 w-5" /> Déconnexion
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="mobile-app-only mobile-tabbar no-print" data-hidden={typing && !open} data-raised={open} aria-label="Navigation principale mobile">
        {tabs.map(({ id, path, label, icon: Icon }) => {
          const isActive = !open && active(path);
          return (
            <Link key={id} to={path} className="mobile-tab" data-active={isActive} aria-current={isActive ? "page" : undefined}>
              {isActive && <motion.span layoutId="mobile-tab-pill" className="mobile-tab-pill" transition={PILL_SPRING} />}
              <Icon className="mobile-tab-icon" />
              <span className="mobile-tab-label">{label}</span>
            </Link>
          );
        })}
        <button
          ref={moreButton}
          type="button"
          onClick={() => (open ? close() : setOpenPath(location.pathname))}
          className="compact-control mobile-tab"
          data-active={moreActive}
          aria-expanded={open}
          aria-controls="mobile-sheet"
          aria-label="Plus"
        >
          {moreActive && <motion.span layoutId="mobile-tab-pill" className="mobile-tab-pill" transition={PILL_SPRING} />}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "close" : "more"}
              className="relative flex"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {open ? <X className="mobile-tab-icon" /> : <LayoutGrid className="mobile-tab-icon" />}
            </motion.span>
          </AnimatePresence>
          <span className="mobile-tab-label">{open ? "Fermer" : "Plus"}</span>
        </button>
      </nav>
    </MotionConfig>
  );
}
