"use client";
import { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowRight, Building2, CheckCircle2, Loader2, ShieldCheck, Store } from "lucide-react";
import { canSwitchBranch } from "../config/access";
import { useAuth } from "../hooks/useAuth";
import { waitForPendingBranchRequests } from "../services/dataSync";
import type { BranchId } from "../types/auth";

// Mirrors the safety margins used by the previous in-Navbar switch flow: a
// short tick so appDataChanged listeners actually call fetch() before we wait
// on them, raced against a ceiling so a hung request can never strand the UI.
const BRANCH_SWITCH_MAX_WAIT_MS = 4000;
const BRANCH_SWITCH_LISTENER_TICK_MS = 30;

const BRANCHES: Array<{ id: BranchId; name: string; description: string }> = [
  { id: "butembo", name: "Butembo", description: "Agence principale" },
  { id: "beni", name: "Beni", description: "Agence secondaire" },
];

export default function SuperadminLanding() {
  const { user, activeBranchId, setActiveBranchId } = useAuth();
  const navigate = useNavigate();
  const [enteringBranch, setEnteringBranch] = useState<BranchId | null>(null);
  // Guards against a second card-click landing while the first switch is
  // still in flight — only the latest click's completion is allowed to act.
  const switchTokenRef = useRef(0);

  if (!canSwitchBranch(user)) return <Navigate to="/" replace />;

  const handleEnter = async (branchId: BranchId) => {
    if (enteringBranch) return; // already processing a click, ignore extra ones
    const myToken = ++switchTokenRef.current;
    setEnteringBranch(branchId);

    if (branchId === activeBranchId) {
      // Nothing to switch — just re-enter the application.
      navigate("/");
      return;
    }

    setActiveBranchId(branchId);
    await new Promise((resolve) => window.setTimeout(resolve, BRANCH_SWITCH_LISTENER_TICK_MS));
    await Promise.race([
      waitForPendingBranchRequests(),
      new Promise((resolve) => window.setTimeout(resolve, BRANCH_SWITCH_MAX_WAIT_MS)),
    ]);

    if (switchTokenRef.current !== myToken) return; // superseded by a newer click
    const label = branchId === "beni" ? "Beni" : "Butembo";
    toast.success(`Agence ${label} active`);
    navigate("/");
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center sm:mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300">
            <Store className="h-7 w-7" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
            Super Admin
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            Choisissez votre espace de travail
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-medium text-slate-600">
            {user?.username ? `Bonjour ${user.username}. ` : ""}
            Sélectionnez l'agence que vous souhaitez consulter. Elle deviendra votre espace de travail actif.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {BRANCHES.map((branch) => {
            const isCurrent = branch.id === activeBranchId;
            const isEntering = enteringBranch === branch.id;
            const disabled = enteringBranch !== null;
            return (
              <button
                key={branch.id}
                type="button"
                disabled={disabled}
                onClick={() => handleEnter(branch.id)}
                className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-6 text-left shadow-xl shadow-slate-200/60 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-2xl hover:shadow-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:p-8"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-100/60 blur-2xl transition group-hover:bg-blue-200/70" />

                <div className="relative flex items-start justify-between gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-md shadow-slate-300">
                    <Building2 className="h-6 w-6" />
                  </span>
                  {isCurrent && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> Actuelle
                    </span>
                  )}
                </div>

                <h2 className="relative mt-5 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  {branch.name}
                </h2>
                <p className="relative mt-1 text-sm font-semibold text-slate-500">
                  {branch.description}
                </p>

                <div className="relative mt-6 flex items-center gap-2 text-sm font-bold text-blue-700">
                  {isEntering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Entrée dans {branch.name}...
                    </>
                  ) : (
                    <>
                      Entrer dans {branch.name}
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          Le changement d'agence n'est disponible qu'à partir de cet écran.
        </div>
      </div>
    </div>
  );
}
