import { useEffect, useMemo, useState } from "react";
import { Building2, Search, ShieldCheck, UserRoundCog } from "lucide-react";
import { Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";
import type { BranchId, Role } from "../types/auth";

interface ManagedUser {
  _id: string;
  username: string;
  email: string;
  role: Role;
  branchId?: BranchId;
  isActive?: boolean;
}

const serverUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const isSuperAdmin = user?.role === "admin" || user?.role === "superadmin" || user?.isSuperAdmin;

  useEffect(() => {
    if (!isSuperAdmin) return;
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${serverUrl}/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Chargement impossible");
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de charger le personnel");
      } finally {
        setLoading(false);
      }
    };
    void loadUsers();
  }, [isSuperAdmin]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((item) =>
      `${item.username} ${item.email} ${item.role}`.toLowerCase().includes(term)
    );
  }, [search, users]);

  const assignBranch = async (managedUser: ManagedUser, branchId: BranchId) => {
    const previousBranch = managedUser.branchId || "butembo";
    if (previousBranch === branchId) return;
    setSavingId(managedUser._id);
    setUsers((current) => current.map((item) => item._id === managedUser._id ? { ...item, branchId } : item));
    try {
      const response = await fetch(`${serverUrl}/users/${managedUser._id}/branch`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ branchId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Affectation impossible");
      setUsers((current) => current.map((item) => item._id === managedUser._id ? { ...item, ...data } : item));
      toast.success(`${managedUser.username} est maintenant affecté à ${branchId === "beni" ? "Beni" : "Butembo"}`);
    } catch (error) {
      setUsers((current) => current.map((item) => item._id === managedUser._id ? { ...item, branchId: previousBranch } : item));
      toast.error(error instanceof Error ? error.message : "Affectation impossible");
    } finally {
      setSavingId(null);
    }
  };

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const counts = users.reduce(
    (result, item) => {
      result[item.branchId === "beni" ? "beni" : "butembo"] += 1;
      return result;
    },
    { butembo: 0, beni: 0 }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50 p-4 sm:p-7">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/85 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-blue-200/50 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                <ShieldCheck className="h-4 w-4" /> Super Admin
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Personnel & agences</h1>
              <p className="mt-2 text-sm text-slate-600">Affectez chaque compte à son agence opérationnelle.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["butembo", "beni"] as const).map((branchId) => (
                <div key={branchId} className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{branchId}</p>
                  <p className="mt-1 text-xl font-bold text-slate-950">{counts[branchId]}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-slate-950 p-2.5 text-white"><UserRoundCog className="h-5 w-5" /></span>
              <div>
                <h2 className="font-bold text-slate-950">Comptes utilisateurs</h2>
                <p className="text-xs text-slate-500">Les comptes existants restent affectés à Butembo par défaut.</p>
              </div>
            </div>
            <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:w-80">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un compte" className="w-full bg-transparent text-sm outline-none" />
            </label>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">Chargement du personnel…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">Aucun compte trouvé.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredUsers.map((item) => (
                <article key={item._id} className="grid gap-4 p-5 transition hover:bg-slate-50/80 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-bold text-slate-950">{item.username}</h3>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold uppercase text-blue-700">{item.role}</span>
                      {item.isActive === false && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">Inactif</span>}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">{item.email}</p>
                  </div>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold text-slate-500">Agence</span>
                    <select
                      value={item.branchId || "butembo"}
                      disabled={savingId === item._id}
                      onChange={(event) => void assignBranch(item, event.target.value as BranchId)}
                      className="bg-transparent text-sm font-bold text-slate-900 outline-none disabled:opacity-50"
                    >
                      <option value="butembo">Butembo</option>
                      <option value="beni">Beni</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
