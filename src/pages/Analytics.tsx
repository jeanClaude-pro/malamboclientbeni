import { motion } from "framer-motion";
import { ArrowUpRight, Building2, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { MODULES, canAccessModule, isSuperAdmin, ROLE_DEFINITIONS } from "../config/access";
import { useAuth } from "../hooks/useAuth";

const sectionOrder = ["Opérations", "Stock & logistique", "Suivi & rapports", "Administration"] as const;

export default function Analytics() {
  const { user, activeBranchId } = useAuth();
  const accessibleModules = MODULES.filter((module) => canAccessModule(user, module));
  const role = user?.role || "staff";
  const branchName = activeBranchId === "beni" ? "Beni" : "Butembo";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 px-4 py-6 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-9"
        >
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-300/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-blue-700">
                <Sparkles className="h-4 w-4" /> Entre Nous Renove
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Bonjour, {user?.username || "Utilisateur"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Sélectionnez un module pour travailler dans l'agence de <strong className="text-slate-950">{branchName}</strong>.
                Chaque accès ci-dessous correspond exactement aux permissions de votre rôle.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/90 px-4 py-3 text-sm font-bold text-blue-800">
                <Building2 className="h-4 w-4" /> Agence de {branchName}
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-bold text-slate-700">
                <ShieldCheck className="h-4 w-4 text-indigo-600" /> {ROLE_DEFINITIONS[role].label}
              </span>
            </div>
          </div>
        </motion.header>

        {accessibleModules.length === 0 ? (
          <section className="rounded-3xl border border-slate-200/90 bg-white/90 p-8 text-center shadow-xl shadow-slate-200/50 backdrop-blur-xl">
            <ShieldCheck className="mx-auto h-10 w-10 text-blue-700" />
            <h2 className="mt-4 text-xl font-bold text-slate-950">Compte sans module opérationnel</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
              Votre compte est actif, mais aucun module supplémentaire n'est associé au rôle Personnel. Contactez le Super Admin si votre fonction doit être modifiée.
            </p>
          </section>
        ) : (
          sectionOrder.map((section) => {
            const modules = accessibleModules.filter((module) => module.section === section);
            if (modules.length === 0) return null;
            return (
              <section key={section} aria-labelledby={`section-${section}`}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 id={`section-${section}`} className="text-xl font-black text-slate-950 sm:text-2xl">{section}</h2>
                    <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-500" />
                  </div>
                  {isSuperAdmin(user) && (
                    <span className="hidden text-xs font-bold uppercase tracking-[0.16em] text-slate-400 sm:block">Accès intégral</span>
                  )}
                </div>
                <div className="grid auto-rows-[minmax(168px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {modules.map((module, index) => {
                    const Icon = module.icon;
                    return (
                      <motion.div
                        key={module.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.04, 0.2) }}
                        className={module.featured ? "sm:col-span-2" : ""}
                      >
                        <Link
                          to={module.path}
                          className={`group relative flex h-full min-h-[168px] flex-col justify-between overflow-hidden rounded-3xl border p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            module.featured
                              ? "border-blue-200/80 bg-gradient-to-br from-white via-blue-50/90 to-indigo-100/70"
                              : "border-slate-200/90 bg-white/90"
                          }`}
                        >
                          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-blue-200/30 blur-2xl transition group-hover:bg-blue-300/45" />
                          <div className="relative flex items-start justify-between gap-4">
                            <span className="rounded-2xl bg-slate-950 p-3 text-white shadow-lg shadow-slate-300 transition-transform group-hover:scale-105">
                              <Icon className="h-5 w-5" />
                            </span>
                            <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-700" />
                          </div>
                          <div className="relative mt-7">
                            <h3 className="text-base font-black uppercase tracking-wide text-slate-950">{module.label}</h3>
                            <p className="mt-2 max-w-xl text-sm leading-5 text-slate-600">{module.description}</p>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
