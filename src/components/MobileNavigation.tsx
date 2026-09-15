import { useEffect, useMemo, useState } from "react";
import { Home, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { MODULES, canAccessModule } from "../config/access";
import { useAuth } from "../hooks/useAuth";

export default function MobileNavigation() {
  const { token, user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const accessible = useMemo(() => MODULES.filter((item) => canAccessModule(user, item)), [user]);

  const primary = useMemo(() => {
    const preferred = ["pos", "products", "transfert", "transfer-reception", "sales", "reports", "historicsortie"];
    return preferred.map((id) => accessible.find((item) => item.id === id)).filter(Boolean).slice(0, 3) as typeof accessible;
  }, [accessible]);
  const primaryIds = new Set(primary.map((item) => item.id));
  const additional = accessible.filter((item) => !primaryIds.has(item.id));

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!token || !user || location.pathname === "/login" || location.pathname === "/workspace") return null;

  const active = (path: string) => location.pathname.toLowerCase() === path.toLowerCase();
  const itemClass = (isActive: boolean) => `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-bold transition active:scale-95 ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-500"}`;

  return (
    <>
      {open && (
        <div className="mobile-app-only no-print fixed inset-0 z-50 flex-col justify-end bg-slate-950/55 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <section className="w-full max-h-[82dvh] overflow-y-auto rounded-t-[2rem] bg-slate-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl" onClick={(event) => event.stopPropagation()} aria-label="Tous les modules">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300" />
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="text-xl font-black text-slate-950">Plus de modules</h2><p className="text-xs text-slate-500">Accès autorisés pour votre rôle</p></div>
              <button type="button" onClick={() => setOpen(false)} className="compact-control flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
            {additional.length ? (
              <div className="grid grid-cols-2 gap-3">
                {additional.map((module) => {
                  const Icon = module.icon;
                  return <Link key={module.id} to={module.path} onClick={() => setOpen(false)} className="flex min-h-24 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[.98]"><Icon className="h-5 w-5 text-blue-700" /><span className="mt-3 text-sm font-extrabold leading-tight text-slate-900">{module.label}</span></Link>;
                })}
              </div>
            ) : <p className="rounded-2xl bg-white p-5 text-center text-sm text-slate-600">Tous vos modules sont déjà dans la barre principale.</p>}
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
