import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Building2, Home, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MODULES, canAccessModule, canSwitchBranch, ROLE_DEFINITIONS } from "../config/access";
import { useAuth } from "../hooks/useAuth";

export default function MobileNavigation() {
  const { token, user, activeBranchId, clearAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const accessible = useMemo(() => MODULES.filter((item) => canAccessModule(user, item)), [user]);

  const primary = useMemo(() => {
    const preferred = ["pos", "products", "transfert", "transfer-reception", "sales", "reports", "historicsortie"];
    return preferred.map((id) => accessible.find((item) => item.id === id)).filter(Boolean).slice(0, 3) as typeof accessible;
  }, [accessible]);
  const primaryIds = new Set(primary.map((item) => item.id));
  const additional = accessible.filter((item) => !primaryIds.has(item.id));

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!token || !user || location.pathname === "/login" || location.pathname === "/workspace") return null;

  const active = (path: string) => location.pathname.toLowerCase() === path.toLowerCase();
  const branchName = activeBranchId === "beni" ? "Beni" : "Butembo";
  const itemClass = (isActive: boolean) => `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold transition active:scale-95 ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-500"}`;
  const logout = () => {
    setOpen(false);
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <>
      {open && (
        <div className="mobile-app-only mobile-sheet-overlay no-print fixed inset-0 z-50 flex-col justify-end bg-slate-950/55 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <section className="w-full max-h-[88dvh] overscroll-contain overflow-y-auto rounded-t-[2rem] bg-slate-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl" onClick={(event) => event.stopPropagation()} aria-label="Centre de contrôle mobile" role="dialog" aria-modal="true">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="text-xl font-black text-slate-950">Plus</h2><p className="text-xs text-slate-500">Modules, agence et compte</p></div>
              <button type="button" onClick={() => setOpen(false)} className="compact-control flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Building2 className="h-5 w-5" /></span>
                <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Agence active</p><p className="font-black text-slate-950">{branchName}</p></div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600"><ShieldCheck className="h-3 w-3" /> {ROLE_DEFINITIONS[user.role].label}</span>
              </div>
              {canSwitchBranch(user) && <button type="button" onClick={() => { setOpen(false); navigate("/workspace"); }} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-extrabold text-blue-800 active:scale-[.99]"><ArrowLeftRight className="h-4 w-4" /> Changer de branche</button>}
            </div>

            {additional.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-xs font-black uppercase tracking-[.16em] text-slate-500">Modules supplémentaires</h3>
                <div className="grid grid-cols-2 gap-3">
                  {additional.map((module) => {
                    const Icon = module.icon;
                    return <Link key={module.id} to={module.path} onClick={() => setOpen(false)} className="flex min-h-24 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[.98]"><Icon className="h-5 w-5 text-blue-700" /><span className="mt-3 text-sm font-extrabold leading-tight text-slate-900">{module.label}</span></Link>;
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-xs font-black uppercase tracking-[.16em] text-slate-500">Compte</h3>
              <button type="button" onClick={logout} className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 text-sm font-extrabold text-red-700 shadow-sm active:bg-red-50"><LogOut className="h-5 w-5" /> Déconnexion</button>
            </div>
          </section>
        </div>
      )}
      <nav className="mobile-app-only no-print fixed inset-x-0 bottom-0 z-40 items-stretch gap-1 border-t border-slate-200/80 bg-white/95 px-2 pt-1.5 pb-[max(.4rem,env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(15,23,42,.12)] backdrop-blur-xl" aria-label="Navigation principale mobile">
        <Link to="/" className={itemClass(active("/"))}><Home className="h-5 w-5" /><span>Accueil</span></Link>
        {primary.map((module) => { const Icon = module.icon; return <Link key={module.id} to={module.path} className={itemClass(active(module.path))}><Icon className="h-5 w-5" /><span className="max-w-full truncate">{module.id === "pos" ? "Vente" : module.id === "products" ? "Stock" : module.label}</span></Link>; })}
        <button type="button" onClick={() => setOpen(true)} className={itemClass(open || (!active("/") && !primary.some((item) => active(item.path))))}><Menu className="h-5 w-5" /><span>Plus</span></button>
      </nav>
    </>
  );
}
