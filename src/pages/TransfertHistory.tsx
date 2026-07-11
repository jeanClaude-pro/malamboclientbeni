// pages/TransfertHistory.tsx
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../services/authService";
import {
  ArrowLeftRight,
  MapPin,
  User,
  Truck,
  Building2,
  Package,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Navigation,
  Download,
  FileText,
  History,
} from "lucide-react";
import jsPDF from "jspdf";
import { formatDateTimeGmt2 } from "../utils/time";

interface Transfer {
  _id: string;
  transferId: string;
  product: {
    productId: string | null;
    name: string;
    cartonQuantity: number;
    looseQuantity: number;
    piecesPerCarton: number;
    totalPieces: number;
  };
  sourceLocation: string;
  destinationAgency: string;
  receiver: { name: string; phone: string };
  transport: {
    driverName: string;
    vehiclePlate: string;
    transportCompany: string;
    deliveryNotes: string;
  };
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  deliveredAt: string | null;
  deliveryConfirmedBy: string;
  notes: string;
  createdByName: string;
  lastModifiedByName: string;
  editHistory: Array<{
    modifiedByName: string;
    modifiedAt: string;
    changes: Record<string, unknown>;
    reason: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface EditFormData {
  sourceLocation?: string;
  destinationAgency?: string;
  product?: Partial<Transfer["product"]>;
  receiver?: Partial<Transfer["receiver"]>;
  transport?: Partial<Transfer["transport"]>;
  notes?: string;
}

interface StatusUpdate {
  status: string;
  reason: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  in_transit: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusLabels: Record<string, string> = {
  pending: "En attente",
  in_transit: "En transit",
  delivered: "Livré",
  cancelled: "Annulé",
};

export default function TransfertHistory() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<StatusUpdate>({ status: "", reason: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [timeframe, setTimeframe] = useState({ from: "", to: "" });

  const [editForm, setEditForm] = useState<EditFormData>({});
  const [editReason, setEditReason] = useState("");

  useEffect(() => {
    fetchCurrentUser();
    fetchTransfers();

    const handleUpdate = () => fetchTransfers();
    window.addEventListener("appDataChanged", handleUpdate);

    return () => {
      window.removeEventListener("appDataChanged", handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, agencyFilter, timeframe]);

  const fetchCurrentUser = async () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser) as { role?: string };
        setIsAdmin(userData.role === "admin");
      }
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (agencyFilter) params.append("destinationAgency", agencyFilter);
      if (timeframe.from) params.append("from", timeframe.from);
      if (timeframe.to) params.append("to", timeframe.to);

      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await apiFetch<{ data: Transfer[] }>(`/transfers${query}`);
      setTransfers(data.data || []);
    } catch (err) {
      console.error("Error fetching transfers:", err);
      setError("Erreur lors du chargement des transferts");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransfers = transfers.filter(
    (t) =>
      t.transferId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destinationAgency.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sourceLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.receiver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transport.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.transport.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => formatDateTimeGmt2(dateString, "fr-FR");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "in_transit":
        return <Navigation className="w-4 h-4" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const viewTransferDetails = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setShowModal(true);
  };

  const openEditModal = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setEditForm({
      sourceLocation: transfer.sourceLocation,
      destinationAgency: transfer.destinationAgency,
      product: { ...transfer.product },
      receiver: { ...transfer.receiver },
      transport: { ...transfer.transport },
      notes: transfer.notes,
    });
    setEditReason("");
    setShowEditModal(true);
  };

  const openStatusModal = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    // "delivered" is set automatically by confirming a reception and isn't a
    // selectable target here, so default away from it if that's the current status.
    setStatusUpdate({ status: transfer.status === "delivered" ? "in_transit" : transfer.status, reason: "" });
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!editingTransfer) return;

    try {
      await apiFetch(`/transfers/${editingTransfer._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: statusUpdate.status,
          reason: statusUpdate.reason,
        }),
      });

      setMessage(`Statut mis à jour: ${statusLabels[statusUpdate.status] || statusUpdate.status}`);
      fetchTransfers();
      setShowStatusModal(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour du statut");
    }
  };

  const handleEditTransfer = async () => {
    if (!editingTransfer) return;

    if (!editReason) {
      setError("Veuillez fournir une raison pour la modification");
      return;
    }

    try {
      await apiFetch(`/transfers/${editingTransfer._id}`, {
        method: "PUT",
        body: JSON.stringify({ ...editForm, reason: editReason }),
      });

      setMessage("Transfert mis à jour avec succès");
      fetchTransfers();
      setShowEditModal(false);
      setEditingTransfer(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour du transfert");
    }
  };

  const handleDeleteTransfer = async (transfer: Transfer) => {
    if (!isAdmin) {
      setError("Seuls les administrateurs peuvent supprimer des transferts");
      return;
    }

    if (!window.confirm(`Supprimer le transfert ${transfer.transferId} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await apiFetch(`/transfers/${transfer._id}`, { method: "DELETE" });

      setMessage("Transfert supprimé avec succès");
      fetchTransfers();
      if (showModal) setShowModal(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression du transfert");
    }
  };

  const generateTransferPDF = (transfer: Transfer) => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Bon de Transfert", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Transfert ID: ${transfer.transferId}`, 20, 35);
    doc.text(`Date: ${formatDate(transfer.createdAt)}`, 20, 42);

    doc.setFontSize(12);
    doc.text("Itinéraire", 20, 55);
    doc.setFontSize(10);
    doc.text(`Provenance: ${transfer.sourceLocation}`, 25, 62);
    doc.text(`Destination: ${transfer.destinationAgency}`, 25, 69);
    doc.text(`Statut: ${statusLabels[transfer.status] || transfer.status}`, 25, 76);

    doc.setFontSize(12);
    doc.text("Article transféré", 20, 89);
    doc.setFontSize(10);
    doc.text(`Produit: ${transfer.product.name}`, 25, 96);
    doc.text(
      `Cartons: ${transfer.product.cartonQuantity} x ${transfer.product.piecesPerCarton} pièces + ${transfer.product.looseQuantity} pièces`,
      25,
      103
    );
    doc.text(`Total pièces: ${transfer.product.totalPieces.toLocaleString()}`, 25, 110);

    doc.setFontSize(12);
    doc.text("Réceptionnaire", 20, 123);
    doc.setFontSize(10);
    doc.text(`Nom: ${transfer.receiver.name || "—"}`, 25, 130);
    doc.text(`Téléphone: ${transfer.receiver.phone || "—"}`, 25, 137);

    doc.setFontSize(12);
    doc.text("Transport", 20, 150);
    doc.setFontSize(10);
    doc.text(`Chauffeur: ${transfer.transport.driverName || "—"}`, 25, 157);
    doc.text(`Plaque: ${transfer.transport.vehiclePlate || "—"}`, 25, 164);
    if (transfer.transport.transportCompany) doc.text(`Société: ${transfer.transport.transportCompany}`, 25, 171);
    if (transfer.transport.deliveryNotes) doc.text(`Notes: ${transfer.transport.deliveryNotes}`, 25, 178);

    doc.setFontSize(10);
    doc.text("Ce document est un justificatif de transfert", 105, 260, { align: "center" });
    doc.text(`Généré par: ${transfer.createdByName}`, 105, 270, { align: "center" });

    doc.save(`transfert-${transfer.transferId}.pdf`);
  };

  const exportToCSV = () => {
    const headers = [
      "Transfert ID", "Statut", "Provenance", "Destination", "Article",
      "Cartons", "Pièces", "Total pièces", "Réceptionnaire", "Chauffeur",
      "Plaque", "Société transport", "Créé le", "Créé par",
    ];

    const rows = filteredTransfers.map((t) => [
      t.transferId,
      statusLabels[t.status] || t.status,
      t.sourceLocation,
      t.destinationAgency,
      t.product.name,
      t.product.cartonQuantity,
      t.product.looseQuantity,
      t.product.totalPieces,
      t.receiver.name,
      t.transport.driverName,
      t.transport.vehiclePlate,
      t.transport.transportCompany,
      formatDate(t.createdAt),
      t.createdByName,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transferts_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setMessage("Export CSV réussi");
    setTimeout(() => setMessage(null), 3000);
  };

  const updateEditField = (field: keyof EditFormData, value: unknown) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateReceiverField = (field: "name" | "phone", value: string) => {
    setEditForm((prev) => ({ ...prev, receiver: { ...prev.receiver, [field]: value } }));
  };

  const updateTransportField = (
    field: "driverName" | "vehiclePlate" | "transportCompany" | "deliveryNotes",
    value: string
  ) => {
    setEditForm((prev) => ({ ...prev, transport: { ...prev.transport, [field]: value } }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ArrowLeftRight className="w-7 h-7 text-blue-600" />
              Historique des Transferts
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestion et suivi de tous les transferts d'articles entre agences
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

            <button
              onClick={fetchTransfers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="p-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
            {error}
            <button onClick={() => setError(null)} className="float-right">×</button>
          </div>
        )}

        {/* Filters Bar */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showFilters && (
            <div className="p-4 space-y-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Tous</option>
                    <option value="pending">En attente</option>
                    <option value="in_transit">En transit</option>
                    <option value="delivered">Livré</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agence de destination</label>
                  <input
                    type="text"
                    value={agencyFilter}
                    onChange={(e) => setAgencyFilter(e.target.value)}
                    placeholder="Rechercher par agence..."
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Du</label>
                  <input
                    type="date"
                    value={timeframe.from}
                    onChange={(e) => setTimeframe({ ...timeframe, from: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Au</label>
                  <input
                    type="date"
                    value={timeframe.to}
                    onChange={(e) => setTimeframe({ ...timeframe, to: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setStatusFilter("");
                    setAgencyFilter("");
                    setTimeframe({ from: "", to: "" });
                  }}
                  className="px-3 py-1 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Effacer les filtres
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher par ID, article, agence, chauffeur, plaque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" />
              Liste des Transferts ({filteredTransfers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Chargement...</p>
              </div>
            ) : filteredTransfers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ArrowLeftRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun transfert trouvé</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Transfert</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itinéraire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Réceptionnaire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transport</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {transfer.transferId}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[transfer.status]}`}>
                          {getStatusIcon(transfer.status)}
                          {statusLabels[transfer.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{transfer.sourceLocation}</div>
                        <div className="text-xs text-gray-500">→ {transfer.destinationAgency}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{transfer.product.name}</div>
                        <div className="text-xs text-gray-500">
                          {transfer.product.cartonQuantity} ctn + {transfer.product.looseQuantity} pcs ={" "}
                          {transfer.product.totalPieces.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{transfer.receiver.name || "—"}</div>
                        <div className="text-xs text-gray-500">{transfer.receiver.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {transfer.transport.driverName || transfer.transport.transportCompany || "—"}
                        </div>
                        <div className="text-xs text-gray-500">{transfer.transport.vehiclePlate}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(transfer.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => viewTransferDetails(transfer)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(transfer)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openStatusModal(transfer)}
                            className="text-green-600 hover:text-green-900"
                            title="Changer statut"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTransfer(transfer)}
                              className="text-red-600 hover:text-red-900"
                              title="Supprimer"
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
            )}
          </div>
        </div>
      </div>

      {/* Transfer Details Modal */}
      {showModal && selectedTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">Détails du Transfert</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Transfer Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">ID Transfert</label>
                  <p className="text-sm font-medium text-gray-900">{selectedTransfer.transferId}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Statut</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[selectedTransfer.status]}`}>
                    {getStatusIcon(selectedTransfer.status)}
                    {statusLabels[selectedTransfer.status]}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Créé par</label>
                  <p className="text-sm text-gray-900">{selectedTransfer.createdByName}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Créé le</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedTransfer.createdAt)}</p>
                </div>
              </div>

              {/* Itinerary */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Itinéraire
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600">Provenance</p>
                    <p className="font-medium">{selectedTransfer.sourceLocation}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600">Agence de destination</p>
                    <p className="font-medium">{selectedTransfer.destinationAgency}</p>
                    {selectedTransfer.deliveredAt && (
                      <p className="text-sm font-semibold text-green-700 mt-1">
                        Livré le: {formatDate(selectedTransfer.deliveredAt)}
                        {selectedTransfer.deliveryConfirmedBy && ` (${selectedTransfer.deliveryConfirmedBy})`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Product */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Article transféré
                </h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-900 text-lg">{selectedTransfer.product.name}</p>
                  <div className="mt-3 flex items-center gap-2 flex-wrap text-sm">
                    <span className="bg-white border border-blue-200 rounded-md px-3 py-1 font-bold text-blue-800">
                      {selectedTransfer.product.cartonQuantity} carton{selectedTransfer.product.cartonQuantity > 1 ? "s" : ""}
                    </span>
                    <span className="text-gray-500">+</span>
                    <span className="bg-white border border-blue-200 rounded-md px-3 py-1 font-bold text-blue-800">
                      {selectedTransfer.product.looseQuantity} pièce{selectedTransfer.product.looseQuantity > 1 ? "s" : ""}
                    </span>
                    <span className="text-gray-500">=</span>
                    <span className="bg-blue-600 text-white rounded-md px-3 py-1 font-bold">
                      {selectedTransfer.product.totalPieces.toLocaleString()} pièces total
                    </span>
                  </div>
                </div>
              </div>

              {/* Receiver */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Réceptionnaire
                </h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">Nom:</span> {selectedTransfer.receiver.name || "—"}</p>
                  <p><span className="text-gray-500">Téléphone:</span> {selectedTransfer.receiver.phone || "—"}</p>
                </div>
              </div>

              {/* Transport */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Transport
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <p><span className="text-gray-500">Chauffeur:</span> {selectedTransfer.transport.driverName || "—"}</p>
                  <p><span className="text-gray-500">Plaque:</span> {selectedTransfer.transport.vehiclePlate || "—"}</p>
                  {selectedTransfer.transport.transportCompany && (
                    <p className="md:col-span-2">
                      <span className="text-gray-500">Société de transport:</span> {selectedTransfer.transport.transportCompany}
                    </p>
                  )}
                  {selectedTransfer.transport.deliveryNotes && (
                    <p className="md:col-span-2 text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedTransfer.transport.deliveryNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedTransfer.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Notes
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedTransfer.notes}</p>
                </div>
              )}

              {/* Edit History */}
              {selectedTransfer.editHistory && selectedTransfer.editHistory.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    Historique des modifications
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedTransfer.editHistory.map((edit, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">{edit.modifiedByName}</span>
                          <span className="text-gray-500">{formatDate(edit.modifiedAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{edit.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t flex-wrap">
                <button
                  onClick={() => generateTransferPDF(selectedTransfer)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => openEditModal(selectedTransfer)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => openStatusModal(selectedTransfer)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Changer statut
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && editingTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Mettre à jour le statut</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau statut</label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="pending">En attente</option>
                  <option value="in_transit">En transit</option>
                  <option value="cancelled">Annulé</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Le statut « Livré » est appliqué automatiquement lors de la confirmation d'une réception dans Réception de Transfert — il ne peut pas être choisi ici.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison</label>
                <textarea
                  value={statusUpdate.reason}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, reason: e.target.value })}
                  placeholder="Raison du changement de statut..."
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleStatusUpdate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Mettre à jour
              </button>
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Modifier le transfert</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provenance</label>
                  <input
                    type="text"
                    value={editForm.sourceLocation || ""}
                    onChange={(e) => updateEditField("sourceLocation", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agence de destination</label>
                  <input
                    type="text"
                    value={editForm.destinationAgency || ""}
                    onChange={(e) => updateEditField("destinationAgency", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Réceptionnaire</label>
                  <input
                    type="text"
                    value={editForm.receiver?.name || ""}
                    onChange={(e) => updateReceiverField("name", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone réceptionnaire</label>
                  <input
                    type="text"
                    value={editForm.receiver?.phone || ""}
                    onChange={(e) => updateReceiverField("phone", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chauffeur</label>
                  <input
                    type="text"
                    value={editForm.transport?.driverName || ""}
                    onChange={(e) => updateTransportField("driverName", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaque du véhicule</label>
                  <input
                    type="text"
                    value={editForm.transport?.vehiclePlate || ""}
                    onChange={(e) => updateTransportField("vehiclePlate", e.target.value.toUpperCase())}
                    className="w-full p-2 border border-gray-300 rounded-lg uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Société de transport</label>
                  <input
                    type="text"
                    value={editForm.transport?.transportCompany || ""}
                    onChange={(e) => updateTransportField("transportCompany", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes de livraison</label>
                  <textarea
                    value={editForm.transport?.deliveryNotes || ""}
                    onChange={(e) => updateTransportField("deliveryNotes", e.target.value)}
                    rows={2}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison de modification *</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Veuillez expliquer pourquoi vous modifiez ce transfert..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditTransfer}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Enregistrer
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
