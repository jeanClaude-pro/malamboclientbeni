import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, Clock3, Save, Search, ShieldCheck, UserRoundCog, UsersRound } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ASSIGNABLE_ROLES, isSuperAdmin, ROLE_DEFINITIONS } from "../config/access";
import { useAuth } from "../hooks/useAuth";
import type { BranchId, Role } from "../types/auth";

interface ManagedUser {
  _id: string;
  username: string;
  email: string;
  role: Role;
  branchId?: BranchId | null;
  isActive?: boolean;
  requiresAssignment?: boolean;
  createdAt?: string;
}

type Filter = "all" | "pending" | BranchId;
type Assignment = { role: Role; branchId: BranchId };
const serverUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Assignment>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const superAdmin = isSuperAdmin(user);

  useEffect(() => {
    if (!superAdmin) return;
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${serverUrl}/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Chargement impossible");
        const list: ManagedUser[] = Array.isArray(data) ? data : [];
        setUsers(list);
        setDrafts(Object.fromEntries(list.map((item) => [item._id, {
          role: item.role || "staff",
          branchId: item.branchId || "butembo",
        }])));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de charger le personnel");
      } finally {
        setLoading(false);
      }
    };
    void loadUsers();
  }, [superAdmin]);

  const counts = useMemo(() => ({
    all: users.length,
    pending: users.filter((item) => item.requiresAssignment).length,
    butembo: users.filter((item) => !item.requiresAssignment && (item.branchId || "butembo") === "butembo").length,
    beni: users.filter((item) => !item.requiresAssignment && item.branchId === "beni").length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((item) => {
      const matchesSearch = !term || `${item.username} ${item.email} ${item.role}`.toLowerCase().includes(term);
      const matchesFilter = filter === "all"
        || (filter === "pending" && item.requiresAssignment)
        || (filter === "butembo" && !item.requiresAssignment && (item.branchId || "butembo") === "butembo")
        || (filter === "beni" && !item.requiresAssignment && item.branchId === "beni");
      return matchesSearch && matchesFilter;
    });
  }, [filter, search, users]);

  const updateDraft = (id: string, patch: Partial<Assignment>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const saveAssignment = async (managedUser: ManagedUser) => {
    const assignment = drafts[managedUser._id];
    if (!assignment) return;
    setSavingId(managedUser._id);
    try {
      const response = await fetch(`${serverUrl}/users/${managedUser._id}/assignment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(assignment),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Affectation impossible");
      setUsers((current) => current.map((item) => item._id === managedUser._id ? { ...item, ...data } : item));
      toast.success(`${managedUser.username}: ${ROLE_DEFINITIONS[assignment.role].label}, agence de ${assignment.branchId === "beni" ? "Beni" : "Butembo"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Affectation impossible");
    } finally {
      setSavingId(null);
    }
  };

  if (!superAdmin) return <Navigate to="/" replace />;

  const filters: { id: Filter; label: string; count: number; icon: typeof Building2 }[] = [
    { id: "all", label: "Tous", count: counts.all, icon: UsersRound },
    { id: "pending", label: "En attente", count: counts.pending, icon: Clock3 },
    { id: "butembo", label: "Butembo", count: counts.butembo, icon: Building2 },
    { id: "beni", label: "Beni", count: counts.beni, icon: Building2 },
  ];

  return (
    <div className="min-h-screen px-4 py-6 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-xl sm:p-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-300/35 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700"><ShieldCheck className="h-4 w-4" /> Super Admin</p>
              <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Personnel & agences</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Approuvez les nouveaux comptes, choisissez leur rôle, puis affectez-les à Butembo ou Beni.</p>
            </div>
            {counts.pending > 0 && (
              <button onClick={() => setFilter("pending")} className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                <Clock3 className="h-4 w-4" /> {counts.pending} compte{counts.pending > 1 ? "s" : ""} à approuver
              </button>
            )}
          </div>
        </header>

        <section aria-label="Filtrer le personnel par agence" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {filters.map((item) => {
            const Icon = item.icon;
            const selected = filter === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`group rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? "border-blue-500 bg-slate-950 text-white" : "border-slate-200 bg-white/90 text-slate-900"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon className={`h-5 w-5 ${selected ? "text-blue-300" : "text-blue-700"}`} />
                  <span className={`text-2xl font-black ${selected ? "text-white" : "text-slate-950"}`}>{item.count}</span>
                </div>
                <p className={`mt-3 text-xs font-bold uppercase tracking-[0.14em] ${selected ? "text-slate-200" : "text-slate-500"}`}>{item.label}</p>
              </button>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-slate-950 p-2.5 text-white"><UserRoundCog className="h-5 w-5" /></span>
              <div><h2 className="font-black text-slate-950">Comptes utilisateurs</h2><p className="text-xs text-slate-500">Cliquez une agence ci-dessus pour voir uniquement ses travailleurs.</p></div>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:w-80">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un compte" className="w-full bg-transparent text-sm outline-none" />
            </label>
          </div>

          {loading ? <div className="p-12 text-center text-sm text-slate-500">Chargement du personnel…</div> : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">Aucun compte dans cette sélection.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUsers.map((item) => {
                const draft = drafts[item._id] || { role: item.role, branchId: item.branchId || "butembo" };
                const changed = item.requiresAssignment || draft.role !== item.role || draft.branchId !== (item.branchId || "butembo");
                const ownAccount = item._id === user?.id;
                return (
                  <article key={item._id} className={`grid gap-4 p-5 transition lg:grid-cols-[minmax(220px,1fr)_minmax(180px,230px)_minmax(160px,200px)_auto] lg:items-center ${item.requiresAssignment ? "bg-amber-50/60" : "hover:bg-slate-50/80"}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-black text-slate-950">{item.username}</h3>
                        {ownAccount && <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-800">Votre compte</span>}
                        {item.requiresAssignment ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800">En attente</span> : item.isActive === false ? <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase text-rose-700">Inactif</span> : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Actif</span>}
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">{item.email}</p>
                    </div>
                    <label className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Rôle</span><select disabled={ownAccount} value={draft.role} onChange={(event) => updateDraft(item._id, { role: event.target.value as Role })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60">{ASSIGNABLE_ROLES.map((role) => <option key={role} value={role}>{ROLE_DEFINITIONS[role].label}</option>)}</select></label>
                    <label className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Agence</span><select disabled={ownAccount} value={draft.branchId} onChange={(event) => updateDraft(item._id, { branchId: event.target.value as BranchId })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 disabled:opacity-60"><option value="butembo">Butembo</option><option value="beni">Beni</option></select></label>
                    <button disabled={ownAccount || !changed || savingId === item._id} onClick={() => void saveAssignment(item)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" /> {item.requiresAssignment ? "Approuver" : "Enregistrer"}</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div><h2 className="text-2xl font-black text-slate-950">Rôles et accès</h2><p className="mt-1 text-sm text-slate-600">Cette liste est la référence utilisée par le tableau de bord et la protection des routes.</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ASSIGNABLE_ROLES.map((role) => {
              const definition = ROLE_DEFINITIONS[role];
              return (
                <article key={role} className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-lg shadow-slate-200/40 backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{definition.label}</h3><p className="mt-1 text-sm text-slate-600">{definition.summary}</p></div><ShieldCheck className="h-5 w-5 shrink-0 text-blue-700" /></div>
                  <ul className="mt-4 space-y-2">{definition.access.map((access) => <li key={access} className="flex gap-2 text-sm text-slate-600"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {access}</li>)}</ul>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
