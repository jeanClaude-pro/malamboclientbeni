import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  X,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
} from "lucide-react";
import { getActiveBranchId } from "../services/dataSync";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  totalPurchases: number;
  totalSpent: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  createdAt: string;
}

interface SaleItem {
  name: string;
  quantity: number;
  paidQuantity: number;
  bonusQuantity: number;
  price: number;
  total: number;
}

interface Sale {
  _id: string;
  saleId: string;
  saleNumber?: string;
  items: SaleItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  paymentType: "cash" | "credit";
  status: string;
  type: string;
  salesPerson: string;
  exchangeRate?: number;
  creditDetails?: {
    amountPaid: number;
    amountDue: number;
    dueDate?: string;
    fullyPaid: boolean;
    payments?: { amount: number; date: string; method: string; recordedBy: string }[];
  };
  createdAt: string;
}

interface FicheSummary {
  totalSales: number;
  totalSpent: number;
  totalCreditSales: number;
  totalCreditTaken: number;
  totalCreditPaid: number;
  totalCreditDue: number;
  unpaidCreditsCount: number;
}

interface FicheData {
  customer: Customer;
  sales: Sale[];
  summary: FicheSummary;
}

const API = import.meta.env.VITE_API_URL;

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

function fmt(amount: number) {
  return new Intl.NumberFormat("fr-CD", { style: "currency", currency: "USD" }).format(amount);
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function Customers() {
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Phone-first fiche search
  const [phoneInput, setPhoneInput] = useState("");
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [ficheData, setFicheData] = useState<FicheData | null>(null);
  const [showFiche, setShowFiche] = useState(false);

  const fetchRecent = useCallback(async () => {
    const requestedBranch = getActiveBranchId();
    setLoadingRecent(true);
    try {
      const [recentRes, statsRes] = await Promise.all([
        fetch(`${API}/customers/recent?limit=5`, { headers: authHeaders() }),
        fetch(`${API}/customers?limit=1&page=1`, { headers: authHeaders() }),
      ]);

      if (recentRes.ok) {
        const data: Customer[] = await recentRes.json();
        if (getActiveBranchId() === requestedBranch) setRecentCustomers(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        if (getActiveBranchId() === requestedBranch) setTotalCount(data.total ?? 0);
      }
    } catch (e) {
      console.error("Failed to load recent customers", e);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  useEffect(() => {
    const handleDataChange = () => { void fetchRecent(); };
    window.addEventListener("appDataChanged", handleDataChange);
    return () => window.removeEventListener("appDataChanged", handleDataChange);
  }, [fetchRecent]);

  async function searchFiche(phone: string) {
    if (!phone.trim()) {
      setSearchError("Veuillez entrer un numéro de téléphone.");
      return;
    }
    setSearchError("");
    setSearching(true);
    try {
      const res = await fetch(`${API}/customers/fiche?phone=${encodeURIComponent(phone.trim())}`, {
        headers: authHeaders(),
      });
      if (res.status === 404) {
        setSearchError("Aucun client trouvé avec ce numéro.");
        return;
      }
      if (!res.ok) {
        setSearchError("Erreur lors de la recherche. Réessayez.");
        return;
      }
      const data: FicheData = await res.json();
      setFicheData(data);
      setShowFiche(true);
    } catch {
      setSearchError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setSearching(false);
    }
  }

  function openFicheForCustomer(customer: Customer) {
    setPhoneInput(customer.phone);
    searchFiche(customer.phone);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-600" />
              Clients
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {totalCount} client{totalCount !== 1 ? "s" : ""} enregistré{totalCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={fetchRecent}
            disabled={loadingRecent}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all text-sm shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRecent ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        {/* Fiche Search */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-xl p-5">
          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5" />
            Fiche client — recherche par téléphone
          </h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => { setPhoneInput(e.target.value); setSearchError(""); }}
                onKeyDown={(e) => e.key === "Enter" && searchFiche(phoneInput)}
                placeholder="Ex: 0812345678"
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => searchFiche(phoneInput)}
              disabled={searching}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white font-medium transition-all"
            >
              {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? "Recherche..." : "Voir la fiche"}
            </button>
          </div>
          {searchError && (
            <p className="mt-2 text-rose-600 text-sm flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {searchError}
            </p>
          )}
          <p className="text-slate-500 text-xs mt-3">
            Les clients sont créés automatiquement lors d'une vente à crédit dans Nouvelle Vente.
          </p>
        </div>

        {/* Recent Customers */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Derniers achats (5 récents)
            </h2>
          </div>

          {loadingRecent ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Chargement...</p>
            </div>
          ) : recentCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Aucun achat enregistré</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentCustomers.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => openFicheForCustomer(c)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-sm font-bold flex-shrink-0 text-white">
                      {(c.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-950 text-sm">{c.name || <span className="text-slate-400">Sans nom</span>}</p>
                      <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div className="hidden sm:block">
                      <p className="text-xs text-slate-500">Achats</p>
                      <p className="text-sm font-semibold text-slate-950">{c.totalPurchases}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-sm font-semibold text-emerald-600">{fmt(c.totalSpent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Dernier achat</p>
                      <p className="text-xs text-slate-600">{fmtDate(c.lastPurchaseDate)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); openFicheForCustomer(c); }}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all opacity-0 group-hover:opacity-100"
                      title="Voir la fiche"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fiche Modal */}
      {showFiche && ficheData && (
        <FicheModal data={ficheData} onClose={() => { setShowFiche(false); setFicheData(null); }} />
      )}
    </div>
  );
}

// ─── Fiche Modal ────────────────────────────────────────────────────────────

function FicheModal({ data, onClose }: { data: FicheData; onClose: () => void }) {
  const { customer, sales, summary } = data;
  const [activeTab, setActiveTab] = useState<"all" | "credit" | "cash">("all");

  const filteredSales = sales.filter((s) => {
    if (activeTab === "credit") return s.paymentType === "credit";
    if (activeTab === "cash") return s.paymentType !== "credit";
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl my-4 shadow-2xl">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-lg font-bold text-white">
              {(customer.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">{customer.name || "Client sans nom"}</h2>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <Phone className="w-3 h-3" />
                {customer.phone}
                {customer.email && (
                  <>
                    <Mail className="w-3 h-3 ml-1" />
                    {customer.email}
                  </>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Total achats"
            value={String(summary.totalSales)}
            icon={<ShoppingBag className="w-4 h-4" />}
            color="blue"
          />
          <SummaryCard
            label="Total dépensé"
            value={fmt(summary.totalSpent)}
            icon={<DollarSign className="w-4 h-4" />}
            color="green"
          />
          <SummaryCard
            label="Crédits pris"
            value={fmt(summary.totalCreditTaken)}
            icon={<CreditCard className="w-4 h-4" />}
            color="amber"
          />
          <SummaryCard
            label="Crédits dus"
            value={fmt(summary.totalCreditDue)}
            icon={summary.totalCreditDue > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            color={summary.totalCreditDue > 0 ? "red" : "green"}
          />
        </div>

        {/* Credit unpaid alert */}
        {summary.unpaidCreditsCount > 0 && (
          <div className="mx-6 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              {summary.unpaidCreditsCount} crédit{summary.unpaidCreditsCount > 1 ? "s" : ""} non soldé{summary.unpaidCreditsCount > 1 ? "s" : ""} — reste à payer: <strong>{fmt(summary.totalCreditDue)}</strong>
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 flex gap-2 border-b border-slate-200 pb-0">
          {(["all", "cash", "credit"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-blue-600"
              }`}
            >
              {tab === "all" ? `Tous (${sales.length})` : tab === "credit" ? `Crédits (${sales.filter((s) => s.paymentType === "credit").length})` : `Comptant (${sales.filter((s) => s.paymentType !== "credit").length})`}
            </button>
          ))}
        </div>

        {/* Sales List */}
        <div className="px-6 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
          {filteredSales.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Aucune vente dans cette catégorie</p>
          ) : (
            filteredSales.map((sale) => <SaleRow key={sale._id} sale={sale} />)
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-slate-500 text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Client depuis {fmtDate(customer.createdAt)}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 text-sm transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, icon, color,
}: {
  label: string; value: string; icon: React.ReactNode; color: "blue" | "green" | "amber" | "red";
}) {
  const colors = {
    blue: "from-blue-50 to-blue-100/50 border-blue-200 text-blue-600",
    green: "from-emerald-50 to-emerald-100/50 border-emerald-200 text-emerald-600",
    amber: "from-amber-50 to-amber-100/50 border-amber-200 text-amber-600",
    red: "from-rose-50 to-rose-100/50 border-rose-200 text-rose-600",
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-lg p-3`}>
      <div className={`flex items-center gap-1.5 mb-1 ${colors[color].split(" ").pop()}`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-slate-950 font-bold text-sm">{value}</p>
    </div>
  );
}

function SaleRow({ sale }: { sale: Sale }) {
  const [expanded, setExpanded] = useState(false);
  const isCredit = sale.paymentType === "credit";
  const cd = sale.creditDetails;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {isCredit ? (
            <CreditCard className="w-4 h-4 text-amber-600 flex-shrink-0" />
          ) : (
            <ShoppingBag className="w-4 h-4 text-blue-600 flex-shrink-0" />
          )}
          <div>
            <p className="text-sm text-slate-950 font-medium">
              {sale.saleNumber || sale.saleId}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {fmtDateTime(sale.createdAt)} — {sale.salesPerson}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-950">{fmt(sale.total)}</p>
            {sale.exchangeRate && (
              <p className="text-xs text-slate-500">1 USD = {sale.exchangeRate.toLocaleString()} FC</p>
            )}
          </div>
          {isCredit && cd && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                cd.fullyPaid
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-amber-50 text-amber-600 border border-amber-200"
              }`}
            >
              {cd.fullyPaid ? "Soldé" : `Dû: ${fmt(cd.amountDue)}`}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 px-4 py-3 space-y-3">
          {/* Items */}
          {sale.items.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Articles</p>
              <div className="space-y-1">
                {sale.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs text-slate-600">
                    <span>{item.name}</span>
                    <span className="text-slate-500">
                      {item.paidQuantity > 0 ? `×${item.paidQuantity}` : ""}
                      {item.bonusQuantity > 0 ? ` +${item.bonusQuantity} bonus` : ""}
                      {" — "}
                      {fmt(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Credit details */}
          {isCredit && cd && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-medium mb-2">Détails du crédit</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Versé: </span>
                  <span className="text-emerald-600">{fmt(cd.amountPaid)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Reste: </span>
                  <span className={cd.amountDue > 0 ? "text-rose-600" : "text-emerald-600"}>{fmt(cd.amountDue)}</span>
                </div>
                {cd.dueDate && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Échéance: </span>
                    <span className="text-amber-700">{fmtDate(cd.dueDate)}</span>
                  </div>
                )}
              </div>
              {cd.payments && cd.payments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <p className="text-xs text-amber-600 mb-1">Historique des paiements</p>
                  {cd.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-500">
                      <span>{fmtDate(p.date)} — {p.method}</span>
                      <span className="text-emerald-600">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
