import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Home, LayoutGrid, Search, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { MODULE_SECTIONS, navigableModules, type ModuleAccess } from "../config/access";
import { useAuth } from "../hooks/useAuth";

const PILL_SPRING = { type: "spring", stiffness: 520, damping: 42, mass: 0.8 } as const;

const samePath = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// Priority+ layout: returns the module indices that fit next to "Accueil" and
// the overflow button. The active module is always kept visible so the bar
// shows where the user is without opening the menu.
function fitModules(available: number, gap: number, home: number, more: number, widths: number[], activeIndex: number): number[] {
  const everything = widths.reduce((total, width) => total + gap + width, home);
  if (everything <= available + 0.5) return widths.map((_, index) => index);

  let used = home + gap + more;
  const pinned = activeIndex >= 0 && used + gap + widths[activeIndex] <= available ? gap + widths[activeIndex] : 0;
  const shown: number[] = [];
  for (let index = 0; index < widths.length; index++) {
    if (index === activeIndex) continue;
    if (used + pinned + gap + widths[index] > available) break;
    used += gap + widths[index];
    shown.push(index);
  }
  if (pinned) shown.push(activeIndex);
  return shown.sort((a, b) => a - b);
}

export default function ModuleNavigation() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const modules = useMemo(() => navigableModules(user), [user]);
  const activeIndex = modules.findIndex((module) => samePath(module.path, pathname));

  const list = useRef<HTMLUListElement>(null);
  const ruler = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState<number[]>(() => modules.map((_, index) => index));
  const [query, setQuery] = useState("");
  // Keyed to the path so the menu closes on any navigation, including back/forward.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  useLayoutEffect(() => {
    const container = list.current;
    const measure = ruler.current;
    if (!container || !measure) return;
    const compute = () => {
      const widths = Array.from(measure.children, (child) => child.getBoundingClientRect().width);
      const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
      const next = fitModules(container.clientWidth, gap, widths[0], widths[widths.length - 1], widths.slice(1, -1), activeIndex);
      setVisible((previous) => (previous.length === next.length && previous.every((value, index) => value === next[index]) ? previous : next));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [modules, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !moreButton.current?.contains(target)) {
        setOpenPath(null);
        setQuery("");
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenPath(null);
      setQuery("");
      moreButton.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => searchInput.current?.focus({ preventScroll: true }));
  }, [open]);

  const shown = new Set(visible.filter((index) => index < modules.length));
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const matchingModules = normalizedQuery
    ? modules.filter((module) => `${module.label} ${module.description}`.toLocaleLowerCase("fr").includes(normalizedQuery))
    : modules;

  const focusPanelLink = (step: number) => {
    const links = Array.from(panel.current?.querySelectorAll<HTMLElement>("a") ?? []);
    if (!links.length) return;
    const current = links.indexOf(document.activeElement as HTMLElement);
    links[(current + step + links.length) % links.length].focus();
  };
  const onMoreKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    setOpenPath(pathname);
    requestAnimationFrame(() => searchInput.current?.focus({ preventScroll: true }));
  };
  const onPanelKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusPanelLink(event.key === "ArrowDown" ? 1 : -1);
    }
  };

  const railLink = (key: string, to: string, label: string, Icon: ModuleAccess["icon"]) => (
    <li key={key}>
      <NavLink to={to} end className={({ isActive }) => `module-nav-link${isActive ? " module-nav-link-active" : ""}`}>
        {({ isActive }) => (
          <>
            {isActive && <motion.span layoutId="module-nav-pill" className="module-nav-pill" transition={PILL_SPRING} />}
            <span className="module-nav-icon"><Icon aria-hidden="true" className="h-4 w-4" /></span>
            <span className="module-nav-label">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  );

  return (
    <nav aria-label="Navigation des modules" className="module-nav">
      <div className="module-nav-inner">
        <ul ref={list} className="module-nav-list">
          {railLink("home", "/", "Accueil", Home)}
          {[...shown].map((index) => railLink(modules[index].id, modules[index].path, modules[index].label, modules[index].icon))}
          <li className="ml-auto">
            <button
              ref={moreButton}
              type="button"
              onClick={() => {
                setOpenPath(open ? null : pathname);
                if (open) setQuery("");
              }}
              onKeyDown={onMoreKeyDown}
              aria-expanded={open}
              aria-controls="module-nav-panel"
              aria-label={`Ouvrir tous les modules (${modules.length})`}
              className={`compact-control module-nav-link module-nav-more${open ? " module-nav-more-open" : ""}`}
            >
              <span className="module-nav-icon"><LayoutGrid aria-hidden="true" className="h-4 w-4" /></span>
              <span className="module-nav-label">Modules</span>
              <span className="module-nav-count" aria-hidden="true">{modules.length}</span>
              <ChevronDown aria-hidden="true" className="module-nav-chevron h-4 w-4" />
            </button>
          </li>
        </ul>

        {/* Off-screen copy of every item at its natural width, used by fitModules. */}
        <div ref={ruler} className="module-nav-ruler" aria-hidden="true" inert>
          {[{ id: "home", label: "Accueil", icon: Home }, ...modules].map(({ id, label, icon: Icon }) => (
            <span key={id} className="module-nav-link"><span className="module-nav-icon"><Icon className="h-4 w-4" /></span><span className="module-nav-label">{label}</span></span>
          ))}
          <span className="module-nav-link module-nav-more"><span className="module-nav-icon"><LayoutGrid className="h-4 w-4" /></span><span className="module-nav-label">Modules</span><span className="module-nav-count">00</span><ChevronDown className="h-4 w-4" /></span>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              ref={panel}
              id="module-nav-panel"
              className="module-nav-panel"
              onKeyDown={onPanelKeyDown}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="module-launcher-header">
                <div>
                  <h2 className="module-launcher-title">Tous les modules</h2>
                  <p className="module-launcher-subtitle">Retrouvez rapidement chaque outil autoris&eacute;.</p>
                </div>
                <span className="module-launcher-total">{modules.length}</span>
              </div>
              <label className="module-launcher-search">
                <Search aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Rechercher un module</span>
                <input
                  ref={searchInput}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={"Rechercher un module\u2026"}
                  autoComplete="off"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="compact-control module-launcher-clear" aria-label="Effacer la recherche">
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </label>
              {MODULE_SECTIONS.map((section) => {
                const items = matchingModules.filter((module) => module.section === section);
                if (!items.length) return null;
                return (
                  <section key={section} className="module-nav-section">
                    <h3 className="module-nav-section-title">{section}</h3>
                    <ul className="module-nav-grid">
                      {items.map(({ id, label, description, path, icon: Icon }) => (
                        <li key={id}>
                          <NavLink to={path} end onClick={() => { setOpenPath(null); setQuery(""); }} className={({ isActive }) => `module-nav-card${isActive ? " module-nav-card-active" : ""}`}>
                            <span className="module-nav-card-icon"><Icon aria-hidden="true" className="h-4 w-4" /></span>
                            <span className="min-w-0">
                              <span className="module-nav-card-label">{label}</span>
                              <span className="module-nav-card-description">{description}</span>
                            </span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
              {!matchingModules.length && (
                <div className="module-launcher-empty">
                  <Search aria-hidden="true" className="h-5 w-5" />
                  <p>Aucun module ne correspond &agrave; "{query}".</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
