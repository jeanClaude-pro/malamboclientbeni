"use client";

import { useState, useEffect } from "react";
import {
  ArrowDownToLine,
  Search,
  Eye,
  Edit,
  Trash2,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Package,
  MapPin,
  User,
  FileText,
  History,
  X,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateTimeGmt2 } from "../utils/time";
import { getActiveBranchId } from "../services/dataSync";
import PaginationControls, { EMPTY_PAGINATION, type PaginationState } from "../components/PaginationControls";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ReceptionProduct {
  productId: string;
  name: string;
  cartonQuantity: number;
  looseQuantity: number;
  piecesPerCarton: number;
  totalPieces: number;
}

interface EditHistoryEntry {
  editedBy: string;
  editedAt: string;
  changes: Record<string, unknown>;
  reason: string;
}

interface Reception {
  _id: string;
  receptionId: string;
  transferId?: string;
  product: ReceptionProduct;
  sourceLocation: string;
  transferReference: string;
  deliveredBy: string;
  receivedBy: string;
  notes: string;
  status: "active" | "voided";
  previousStock: number;
  newStock: number;
  recordedBy: string;
  editHistory: EditHistoryEntry[];
  voidedBy?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

type TimeframeType = "today" | "day" | "month" | "year" | "custom";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatStock(totalPieces: number, piecesPerCarton: number): string {
  const ppc = Math.max(1, Math.floor(Number(piecesPerCarton || 1)));
  const total = Math.max(0, Math.floor(Number(totalPieces || 0)));
  if (ppc <= 1) return `${total} pièce${total !== 1 ? "s" : ""}`;
  const cartons = Math.floor(total / ppc);
  const pieces = total % ppc;
  if (pieces === 0) return `${cartons} carton${cartons !== 1 ? "s" : ""}`;
  return `${cartons} boîte${cartons !== 1 ? "s" : ""} et ${pieces} pièce${pieces !== 1 ? "s" : ""}`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getCurrentYear(): number { return new Date().getFullYear(); }
function getCurrentMonth(): string {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, "0");
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TransferReceptionHistory() {
  // Data
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "voided">("all");
  const [timeframeType, setTimeframeType] = useState<TimeframeType>("today");
  const [queryParams, setQueryParams] = useState({
    date: getTodayStr(),
    year: String(getCurrentYear()),
    month: getCurrentMonth(),
    from: "",
    to: "",
  });

  // View modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingReception, setViewingReception] = useState<Reception | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReception, setEditingReception] = useState<Reception | null>(null);
  const [editForm, setEditForm] = useState({
    cartonQuantity: 0,
    looseQuantity: 0,
    sourceLocation: "",
    transferReference: "",
    deliveredBy: "",
    receivedBy: "",
    notes: "",
    reason: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Summary
  const [summary, setSummary] = useState({ total: 0, active: 0, voided: 0, totalPiecesReceived: 0 });
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);

  useEffect(() => setPagination((current) => ({ ...current, page: 1 })), [timeframeType, queryParams, statusFilter]);

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const user = (() => {
      try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
    })();
    setIsAdmin(user.role === "admin" || user.role === "superadmin");
    setIsManager(user.role === "admin" || user.role === "superadmin" || user.role === "manager");

    fetchReceptions();

    const handleUpdate = () => fetchReceptions();
    window.addEventListener("appDataChanged", handleUpdate);
    return () => {
      window.removeEventListener("appDataChanged", handleUpdate);
    };
  }, []);

  useEffect(() => {
    fetchReceptions();
  }, [timeframeType, queryParams, statusFilter, pagination.page]);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const buildQueryString = (): string => {
    const params = new URLSearchParams();
    switch (timeframeType) {
      case "today": params.append("date", getTodayStr()); break;
      case "day": if (queryParams.date) params.append("date", queryParams.date); break;
      case "month":
        if (queryParams.year) params.append("year", queryParams.year);
        if (queryParams.month) params.append("month", queryParams.month);
        break;
      case "year": if (queryParams.year) params.append("year", queryParams.year); break;
      case "custom":
        if (queryParams.from) params.append("from", queryParams.from);
        if (queryParams.to) params.append("to", queryParams.to);
        break;
    }
    if (statusFilter !== "all") params.append("status", statusFilter);
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));
    return params.toString();
  };

  const fetchReceptions = async () => {
    const requestedBranch = getActiveBranchId();
    try {
      setLoading(true);
      setError(null);
      const qs = buildQueryString();
      const url = `${import.meta.env.VITE_API_URL}/transfer-receptions${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (getActiveBranchId() !== requestedBranch) return; // stale — branch changed mid-flight
      if (data.success) {
        setReceptions(data.data || []);
        setSummary(data.summary || { total: 0, active: 0, voided: 0, totalPiecesReceived: 0 });
        setPagination(data.pagination || EMPTY_PAGINATION);
      } else {
        setError(data.error || "Erreur lors du chargement");
      }
    } catch {
      setError("Impossible de charger les réceptions. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered list ───────────────────────────────────────────────────────────

  const filteredReceptions = receptions.filter((r) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      r.receptionId.toLowerCase().includes(q) ||
      r.product.name.toLowerCase().includes(q) ||
      r.sourceLocation.toLowerCase().includes(q) ||
      r.transferReference.toLowerCase().includes(q) ||
      r.deliveredBy.toLowerCase().includes(q) ||
      r.receivedBy.toLowerCase().includes(q)
    );
  });

  // ── Actions ─────────────────────────────────────────────────────────────────

  const showFeedback = (msg: string, isError = false) => {
    if (isError) setError(msg); else setMessage(msg);
    setTimeout(() => { setMessage(null); setError(null); }, 5000);
  };

  const dispatchRefresh = () => {
    window.dispatchEvent(new CustomEvent("productsUpdated"));
    window.dispatchEvent(new CustomEvent("salesUpdated"));
    window.dispatchEvent(new CustomEvent("transferReceptionUpdated"));
  };

  const openViewModal = (r: Reception) => { setViewingReception(r); setShowViewModal(true); };
  const closeViewModal = () => { setShowViewModal(false); setViewingReception(null); };

  const openEditModal = (r: Reception) => {
    if (r.status === "voided") { showFeedback("Impossible de modifier une réception annulée", true); return; }
    setEditingReception(r);
    setEditForm({
      cartonQuantity: r.product.cartonQuantity,
      looseQuantity: r.product.looseQuantity,
      sourceLocation: r.sourceLocation,
      transferReference: r.transferReference,
      deliveredBy: r.deliveredBy,
      receivedBy: r.receivedBy,
      notes: r.notes || "",
      reason: "",
    });
    setEditError(null);
    setShowEditModal(true);
  };
  const closeEditModal = () => { setShowEditModal(false); setEditingReception(null); };

  const handleEdit = async () => {
    if (!editingReception) return;
    if (!editForm.reason.trim()) { setEditError("La raison de la modification est requise"); return; }

    try {
      setEditSubmitting(true);
      setEditError(null);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/transfer-receptions/${editingReception._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify(editForm),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback("✅ Réception modifiée avec succès");
        closeEditModal();
        await fetchReceptions();
        dispatchRefresh();
      } else {
        setEditError(data.error || "Échec de la modification");
      }
    } catch {
      setEditError("Erreur de connexion au serveur");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleVoid = async (r: Reception) => {
    if (r.status === "voided") { showFeedback("Cette réception est déjà annulée", true); return; }
    const reopenNote = r.transferId ? "\nLe transfert d'origine repassera en statut \"En transit\"." : "";
    const reason = window.prompt(
      `Annuler la réception ${r.receptionId} ?\nCela retirera ${formatStock(r.product.totalPieces, r.product.piecesPerCarton)} du stock.${reopenNote}\n\nRaison de l'annulation :`
    );
    if (reason === null) return; // cancelled

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/transfer-receptions/${r._id}/void`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: JSON.stringify({ reason: reason.trim() || "Annulée" }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback("✅ Réception annulée avec succès");
        if (showViewModal) closeViewModal();
        await fetchReceptions();
        dispatchRefresh();
      } else {
        showFeedback(data.error || "Échec de l'annulation", true);
      }
    } catch {
      showFeedback("Erreur de connexion au serveur", true);
    }
  };

  const handleDelete = async (r: Reception) => {
    if (!window.confirm(`Supprimer définitivement la réception ${r.receptionId} ?\nCette action est irréversible.`)) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/transfer-receptions/${r._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        showFeedback("✅ Réception supprimée avec succès");
        if (showViewModal) closeViewModal();
        await fetchReceptions();
        dispatchRefresh();
      } else {
        showFeedback(data.error || "Échec de la suppression", true);
      }
    } catch {
      showFeedback("Erreur de connexion au serveur", true);
    }
  };

  // ── Sub-render helpers ──────────────────────────────────────────────────────

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm";

  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        status === "active"
          ? "bg-green-100 text-green-800 border border-green-200"
          : "bg-red-100 text-red-800 border border-red-200"
      }`}
    >
      {status === "active" ? "Actif" : "Annulé"}
    </span>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <History className="w-6 h-6 text-green-600" />
              </div>
              Historique des réceptions
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Consultez et gérez toutes les réceptions de transfert
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchReceptions()}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
            <Link
              to="/transfer-reception"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvelle réception
            </Link>
          </div>
        </div>

        {/* Feedback */}
        {message && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: summary.total, color: "blue" },
            { label: "Actives", value: summary.active, color: "green" },
            { label: "Annulées", value: summary.voided, color: "red" },
            {
              label: "Pièces reçues",
              value: summary.totalPiecesReceived.toLocaleString(),
              color: "purple",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm"
            >
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                {card.label}
              </p>
              <p
                className={`text-2xl font-bold mt-1 text-${card.color}-600`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Timeframe tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "today", label: "Aujourd'hui" },
                { key: "day", label: "Jour" },
                { key: "month", label: "Mois" },
                { key: "year", label: "Année" },
                { key: "custom", label: "Personnalisé" },
              ] as { key: TimeframeType; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTimeframeType(tab.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  timeframeType === tab.key
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Timeframe controls */}
          {timeframeType === "day" && (
            <input
              type="date"
              value={queryParams.date}
              onChange={(e) => setQueryParams((p) => ({ ...p, date: e.target.value }))}
              className={inputClass + " max-w-xs"}
            />
          )}
          {timeframeType === "month" && (
            <div className="flex gap-2 flex-wrap">
              <select
                value={queryParams.year}
                onChange={(e) => setQueryParams((p) => ({ ...p, year: e.target.value }))}
                className={inputClass + " max-w-xs"}
              >
                {Array.from({ length: 5 }, (_, i) => getCurrentYear() - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={queryParams.month}
                onChange={(e) => setQueryParams((p) => ({ ...p, month: e.target.value }))}
                className={inputClass + " max-w-xs"}
              >
                {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m, i) => (
                  <option key={m} value={m}>
                    {new Date(2000, i).toLocaleString("fr-FR", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
          )}
          {timeframeType === "year" && (
            <select
              value={queryParams.year}
              onChange={(e) => setQueryParams((p) => ({ ...p, year: e.target.value }))}
              className={inputClass + " max-w-xs"}
            >
              {Array.from({ length: 5 }, (_, i) => getCurrentYear() - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}
          {timeframeType === "custom" && (
            <div className="flex gap-2 flex-wrap">
              <input
                type="date"
                value={queryParams.from}
                onChange={(e) => setQueryParams((p) => ({ ...p, from: e.target.value }))}
                className={inputClass + " max-w-xs"}
                placeholder="De"
              />
              <input
                type="date"
                value={queryParams.to}
                onChange={(e) => setQueryParams((p) => ({ ...p, to: e.target.value }))}
                className={inputClass + " max-w-xs"}
                placeholder="À"
              />
            </div>
          )}
        </div>

        {/* Search + status filter */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par réf., produit, provenance..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "voided"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  statusFilter === s
                    ? s === "all"
                      ? "bg-gray-700 text-white border-gray-700"
                      : s === "active"
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-red-600 text-white border-red-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {s === "all" ? "Tous" : s === "active" ? "Actifs" : "Annulés"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Chargement...</span>
            </div>
          ) : filteredReceptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <ArrowDownToLine className="w-10 h-10" />
              <p className="text-sm">Aucune réception trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Réf.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Produit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantité</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Provenance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Réf. transfert</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Réceptionné par</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredReceptions.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-700">{r.receptionId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{r.product.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green-700 font-medium">
                          +{formatStock(r.product.totalPieces, r.product.piecesPerCarton)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">{r.sourceLocation}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="font-mono text-xs text-gray-500">{r.transferReference}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{r.receivedBy}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDateTimeGmt2(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openViewModal(r)}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(r)}
                            disabled={r.status === "voided"}
                            className={`p-1.5 rounded transition-colors ${
                              r.status === "voided"
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-yellow-600 hover:bg-yellow-50"
                            }`}
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {isManager && (
                            <button
                              onClick={() => handleVoid(r)}
                              disabled={r.status === "voided"}
                              className={`p-1.5 rounded transition-colors ${
                                r.status === "voided"
                                  ? "text-gray-300 cursor-not-allowed"
                                  : "text-orange-600 hover:bg-orange-50"
                              }`}
                              title="Annuler la réception"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(r)}
                              className="p-1.5 rounded text-red-600 hover:bg-red-50 transition-colors"
                              title="Supprimer définitivement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── View Modal ─────────────────────────────────────────────────────────── */}
      {showViewModal && viewingReception && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-green-600" />
                {viewingReception.receptionId}
              </h3>
              <button onClick={closeViewModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <StatusBadge status={viewingReception.status} />
                <span className="text-xs text-gray-500">{formatDateTimeGmt2(viewingReception.createdAt)}</span>
              </div>

              {/* Product */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Produit reçu
                </p>
                <p className="font-semibold text-gray-900">{viewingReception.product.name}</p>
                <p className="text-sm text-green-700 mt-1">
                  <strong>+{formatStock(viewingReception.product.totalPieces, viewingReception.product.piecesPerCarton)}</strong>
                </p>
                <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-1">
                  <span>Cartons: {viewingReception.product.cartonQuantity}</span>
                  <span>Pièces vrac: {viewingReception.product.looseQuantity}</span>
                  <span>Stock avant: {viewingReception.previousStock}</span>
                  <span>Stock après: {viewingReception.newStock}</span>
                </div>
              </div>

              {/* Transfer info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    <MapPin className="inline w-3 h-3 mr-1" />Provenance
                  </p>
                  <p className="text-gray-900">{viewingReception.sourceLocation}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    <FileText className="inline w-3 h-3 mr-1" />Réf. transfert
                  </p>
                  <p className="font-mono text-gray-900">{viewingReception.transferReference}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    <User className="inline w-3 h-3 mr-1" />Livré par
                  </p>
                  <p className="text-gray-900">{viewingReception.deliveredBy}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    <User className="inline w-3 h-3 mr-1" />Réceptionné par
                  </p>
                  <p className="text-gray-900">{viewingReception.receivedBy}</p>
                </div>
                {viewingReception.recordedBy && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Enregistré par</p>
                    <p className="text-gray-900">{viewingReception.recordedBy}</p>
                  </div>
                )}
              </div>

              {viewingReception.notes && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                  <p className="text-xs font-medium text-gray-500 mb-1">Remarques</p>
                  {viewingReception.notes}
                </div>
              )}

              {viewingReception.status === "voided" && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-red-700">Annulée par {viewingReception.voidedBy}</p>
                  {viewingReception.voidReason && (
                    <p className="text-red-600 text-xs mt-0.5">Raison: {viewingReception.voidReason}</p>
                  )}
                </div>
              )}

              {/* Edit history */}
              {viewingReception.editHistory && viewingReception.editHistory.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <History className="w-3.5 h-3.5" /> Historique des modifications
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {viewingReception.editHistory.map((h, i) => (
                      <div key={i} className="bg-gray-50 rounded p-2 text-xs text-gray-600">
                        <span className="font-medium">{h.editedBy}</span> — {formatDateTimeGmt2(h.editedAt)}
                        {h.reason && <p className="text-gray-500 mt-0.5">Raison: {h.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => { closeViewModal(); openEditModal(viewingReception); }}
                  disabled={viewingReception.status === "voided"}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    viewingReception.status === "voided"
                      ? "border-gray-200 text-gray-400 cursor-not-allowed"
                      : "border-blue-300 text-blue-600 hover:bg-blue-50"
                  }`}
                >
                  <Edit className="w-4 h-4" /> Modifier
                </button>
                {isManager && (
                  <button
                    onClick={() => handleVoid(viewingReception)}
                    disabled={viewingReception.status === "voided"}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      viewingReception.status === "voided"
                        ? "border-gray-200 text-gray-400 cursor-not-allowed"
                        : "border-orange-300 text-orange-600 hover:bg-orange-50"
                    }`}
                  >
                    <Shield className="w-4 h-4" /> Annuler
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(viewingReception)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                )}
                <button
                  onClick={closeViewModal}
                  className="ml-auto px-3 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────────── */}
      <PaginationControls value={pagination} onPageChange={(page) => setPagination((current) => ({ ...current, page }))} />

      {showEditModal && editingReception && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-yellow-600" />
                Modifier — {editingReception.receptionId}
              </h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {editError}
                </div>
              )}

              {/* Current product info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-900">{editingReception.product.name}</p>
                <p className="text-blue-700 text-xs mt-0.5">
                  Quantité originale: {formatStock(editingReception.product.totalPieces, editingReception.product.piecesPerCarton)}
                </p>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cartons</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.cartonQuantity}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, cartonQuantity: Math.max(0, parseInt(e.target.value) || 0) }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pièces vrac (max {editingReception.product.piecesPerCarton - 1})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={editingReception.product.piecesPerCarton - 1}
                    value={editForm.looseQuantity}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, looseQuantity: Math.max(0, parseInt(e.target.value) || 0) }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {/* New total preview */}
              {(() => {
                const ppc = editingReception.product.piecesPerCarton;
                const newTotal = editForm.cartonQuantity * ppc + editForm.looseQuantity;
                const diff = newTotal - editingReception.product.totalPieces;
                return newTotal > 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                    Nouvelle quantité: <strong>{formatStock(newTotal, ppc)}</strong>
                    {diff !== 0 && (
                      <span className={diff > 0 ? " text-green-700" : " text-red-700"}>
                        {" "}({diff > 0 ? "+" : ""}{formatStock(Math.abs(diff), ppc)} par rapport à l'original)
                      </span>
                    )}
                  </div>
                ) : null;
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provenance</label>
                <input type="text" value={editForm.sourceLocation}
                  disabled={!!editingReception.transferId}
                  onChange={(e) => setEditForm((p) => ({ ...p, sourceLocation: e.target.value }))}
                  className={`${inputClass} ${editingReception.transferId ? "bg-gray-100 cursor-not-allowed" : ""}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Réf. transfert</label>
                <input type="text" value={editForm.transferReference}
                  disabled={!!editingReception.transferId}
                  onChange={(e) => setEditForm((p) => ({ ...p, transferReference: e.target.value }))}
                  className={`${inputClass} ${editingReception.transferId ? "bg-gray-100 cursor-not-allowed" : ""}`} />
              </div>
              {editingReception.transferId && (
                <p className="text-xs text-gray-500 -mt-2">
                  La provenance et la référence sont liées au transfert d'origine et ne peuvent pas être modifiées ici.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Livré par</label>
                  <input type="text" value={editForm.deliveredBy}
                    onChange={(e) => setEditForm((p) => ({ ...p, deliveredBy: e.target.value }))}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Réceptionné par</label>
                  <input type="text" value={editForm.receivedBy}
                    onChange={(e) => setEditForm((p) => ({ ...p, receivedBy: e.target.value }))}
                    className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarques</label>
                <textarea rows={2} value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  className={inputClass + " resize-none"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raison de la modification <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.reason}
                  onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Ex: Erreur de saisie, quantité corrigée..."
                  className={inputClass + " border-yellow-300 focus:ring-yellow-400"}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEdit}
                  disabled={editSubmitting || !editForm.reason.trim()}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2.5 rounded-lg hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {editSubmitting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Modification...</>
                  ) : (
                    <><Edit className="w-4 h-4" /> Enregistrer</>
                  )}
                </button>
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
