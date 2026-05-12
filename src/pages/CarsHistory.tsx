// components/CarsHistory.tsx
"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "../services/authService";
import {
  Truck,
  MapPin,
  User,
  Package,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  FileText,
  History,
  Navigation,
  PackageCheck,
} from "lucide-react";
import jsPDF from "jspdf";
import { formatDateTimeGmt2 } from "../utils/time";

interface CarTrip {
  _id: string;
  tripId: string;
  origin: string;
  destination: string;
  driver: {
    name: string;
    phone: string;
    licenseNumber: string;
  };
  vehicle: {
    plateNumber: string;
    model: string;
    capacity: number;
  };
  cargo: {
    productId: string;
    productName: string;
    boxesCount: number;
    piecesPerBox: number;
    totalPieces: number;
    weight: number;
    value: number;
  };
  departureTime: string;
  expectedArrivalTime: string;
  actualArrivalTime: string | null;
  arrivalDetails?: {
    confirmedAt: string | null;
    confirmedBy: string;
    receivedBoxes: number;
    receivedPieces: number;
    totalReceivedPieces: number;
    notes: string;
  };
  status: "planned" | "en_route" | "delayed" | "arrived" | "cancelled" | "completed";
  currentLocation: string;
  lastUpdate: string;
  fuelCost: number;
  tollCost: number;
  otherCosts: number;
  totalCost: number;
  notes: string;
  createdBy: string;
  createdByName: string;
  lastModifiedBy: string;
  lastModifiedByName: string;
  editHistory: Array<{
    modifiedBy: string;
    modifiedByName: string;
    modifiedAt: string;
    changes: Record<string, unknown>;
    reason: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface EditDriver {
  name?: string;
  phone?: string;
  licenseNumber?: string;
}

interface EditVehicle {
  plateNumber?: string;
  model?: string;
  capacity?: number;
}

interface EditCargo {
  productId?: string;
  productName?: string;
  boxesCount?: number;
  piecesPerBox?: number;
  totalPieces?: number;
  weight?: number;
  value?: number;
}

interface EditFormData {
  origin?: string;
  destination?: string;
  driver?: EditDriver;
  vehicle?: EditVehicle;
  cargo?: EditCargo;
  departureTime?: string;
  expectedArrivalTime?: string;
  fuelCost?: number;
  tollCost?: number;
  otherCosts?: number;
  notes?: string;
}

interface StatusUpdate {
  status: string;
  reason: string;
  currentLocation: string;
}


const statusColors: Record<string, string> = {
  planned: "bg-blue-100 text-blue-800 border-blue-200",
  en_route: "bg-yellow-100 text-yellow-800 border-yellow-200",
  delayed: "bg-red-100 text-red-800 border-red-200",
  arrived: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-purple-100 text-purple-800 border-purple-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

const statusLabels: Record<string, string> = {
  planned: "Planifié",
  en_route: "En Route",
  delayed: "Retardé",
  arrived: "Arrivé",
  completed: "Terminé",
  cancelled: "Annulé",
};

export default function CarsHistory() {
  const [trips, setTrips] = useState<CarTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<CarTrip | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<CarTrip | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<StatusUpdate>({ status: "", reason: "", currentLocation: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState("");
  const [plateFilter, setPlateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [timeframe, setTimeframe] = useState({ from: "", to: "" });
  
  const [editForm, setEditForm] = useState<EditFormData>({});
  const [editReason, setEditReason] = useState("");

  const [showArrivalModal, setShowArrivalModal] = useState(false);
  const [arrivalTrip, setArrivalTrip] = useState<CarTrip | null>(null);
  const [arrivalForm, setArrivalForm] = useState({
    arrivalDate: new Date().toISOString().slice(0, 10),
    receivedBoxes: 0,
    receivedPieces: 0,
    notes: "",
  });
  const [arrivalSubmitting, setArrivalSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchTrips();
    
    const handleTripUpdate = () => fetchTrips();
    window.addEventListener("tripCreated", handleTripUpdate);
    
    return () => {
      window.removeEventListener("tripCreated", handleTripUpdate);
    };
  }, [statusFilter, plateFilter, timeframe]);

  const fetchCurrentUser = async () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser) as { role?: string };
        setIsAdmin(userData.role === "admin");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      
      if (statusFilter) params.append("status", statusFilter);
      if (plateFilter) params.append("plateNumber", plateFilter);
      if (timeframe.from) params.append("from", timeframe.from);
      if (timeframe.to) params.append("to", timeframe.to);
      
      const query = params.toString() ? `?${params.toString()}` : "";

      const data = await apiFetch<{ data: CarTrip[] }>(`/car-trips${query}`);
      setTrips(data.data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
      setError("Erreur lors du chargement des trajets");
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = trips.filter(trip =>
    trip.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.driver.phone.includes(searchTerm) ||
    trip.vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return formatDateTimeGmt2(dateString, "fr-FR");
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "planned": return <Clock className="w-4 h-4" />;
      case "en_route": return <Navigation className="w-4 h-4" />;
      case "delayed": return <AlertTriangle className="w-4 h-4" />;
      case "arrived": return <CheckCircle className="w-4 h-4" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const viewTripDetails = (trip: CarTrip) => {
    setSelectedTrip(trip);
    setShowModal(true);
  };

  const openEditModal = (trip: CarTrip) => {
    setEditingTrip(trip);
    setEditForm({
      origin: trip.origin,
      destination: trip.destination,
      driver: {
        name: trip.driver.name,
        phone: trip.driver.phone,
        licenseNumber: trip.driver.licenseNumber,
      },
      vehicle: {
        plateNumber: trip.vehicle.plateNumber,
        model: trip.vehicle.model,
        capacity: trip.vehicle.capacity,
      },
      cargo: {
        productId: trip.cargo.productId,
        productName: trip.cargo.productName,
        boxesCount: trip.cargo.boxesCount,
        piecesPerBox: trip.cargo.piecesPerBox,
        totalPieces: trip.cargo.totalPieces,
        weight: trip.cargo.weight,
        value: trip.cargo.value,
      },
      departureTime: trip.departureTime.split('T')[0] + 'T' + (trip.departureTime.split('T')[1]?.slice(0, 5) || "00:00"),
      expectedArrivalTime: trip.expectedArrivalTime.split('T')[0] + 'T' + (trip.expectedArrivalTime.split('T')[1]?.slice(0, 5) || "00:00"),
      fuelCost: trip.fuelCost,
      tollCost: trip.tollCost,
      otherCosts: trip.otherCosts,
      notes: trip.notes,
    });
    setEditReason("");
    setShowEditModal(true);
  };

  const openStatusModal = (trip: CarTrip) => {
    setEditingTrip(trip);
    setStatusUpdate({
      status: trip.status,
      reason: "",
      currentLocation: trip.currentLocation || "",
    });
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async () => {
    if (!editingTrip) return;
    
    try {
      await apiFetch(`/car-trips/${editingTrip._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: statusUpdate.status,
          reason: statusUpdate.reason,
          currentLocation: statusUpdate.currentLocation,
        }),
      });

      setMessage(`✅ Statut mis à jour: ${statusLabels[statusUpdate.status] || statusUpdate.status}`);
      fetchTrips();
      setShowStatusModal(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de la mise à jour du statut";
      setError(msg);
    }
  };

  const handleEditTrip = async () => {
    if (!editingTrip) return;
    
    if (!editReason) {
      setError("Veuillez fournir une raison pour la modification");
      return;
    }
    
    try {
      const updatePayload: Record<string, unknown> = { reason: editReason };
      
      if (editForm.origin !== undefined) updatePayload.origin = editForm.origin;
      if (editForm.destination !== undefined) updatePayload.destination = editForm.destination;
      if (editForm.driver) updatePayload.driver = editForm.driver;
      if (editForm.vehicle) updatePayload.vehicle = editForm.vehicle;
      if (editForm.cargo) updatePayload.cargo = editForm.cargo;
      if (editForm.departureTime !== undefined) updatePayload.departureTime = editForm.departureTime;
      if (editForm.expectedArrivalTime !== undefined) updatePayload.expectedArrivalTime = editForm.expectedArrivalTime;
      if (editForm.fuelCost !== undefined) updatePayload.fuelCost = editForm.fuelCost;
      if (editForm.tollCost !== undefined) updatePayload.tollCost = editForm.tollCost;
      if (editForm.otherCosts !== undefined) updatePayload.otherCosts = editForm.otherCosts;
      if (editForm.notes !== undefined) updatePayload.notes = editForm.notes;
      
      await apiFetch(`/car-trips/${editingTrip._id}`, {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      });

      setMessage("✅ Trajet mis à jour avec succès");
      fetchTrips();
      setShowEditModal(false);
      setEditingTrip(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de la mise à jour du trajet";
      setError(msg);
    }
  };

  const handleDeleteTrip = async (trip: CarTrip) => {
    if (!isAdmin) {
      setError("Seuls les administrateurs peuvent supprimer des trajets");
      return;
    }
    
    if (!window.confirm(`Supprimer le trajet ${trip.tripId} ? Cette action est irréversible.`)) {
      return;
    }
    
    try {
      await apiFetch(`/car-trips/${trip._id}`, { method: "DELETE" });

      setMessage("✅ Trajet supprimé avec succès");
      fetchTrips();
      if (showModal) setShowModal(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur lors de la suppression du trajet";
      setError(msg);
    }
  };

  const generateTripPDF = (trip: CarTrip) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Bon de Transport", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Trip ID: ${trip.tripId}`, 20, 35);
    doc.text(`Date: ${formatDate(trip.createdAt)}`, 20, 42);
    
    doc.setFontSize(12);
    doc.text("Itinéraire", 20, 55);
    doc.setFontSize(10);
    doc.text(`Départ: ${trip.origin}`, 25, 62);
    doc.text(`Destination: ${trip.destination}`, 25, 69);
    doc.text(`Statut: ${statusLabels[trip.status] || trip.status}`, 25, 76);
    
    doc.setFontSize(12);
    doc.text("Chauffeur", 20, 89);
    doc.setFontSize(10);
    doc.text(`Nom: ${trip.driver.name}`, 25, 96);
    doc.text(`Téléphone: ${trip.driver.phone}`, 25, 103);
    if (trip.driver.licenseNumber) {
      doc.text(`Permis: ${trip.driver.licenseNumber}`, 25, 110);
    }
    
    doc.setFontSize(12);
    doc.text("Véhicule", 20, 123);
    doc.setFontSize(10);
    doc.text(`Plaque: ${trip.vehicle.plateNumber}`, 25, 130);
    if (trip.vehicle.model) doc.text(`Modèle: ${trip.vehicle.model}`, 25, 137);
    if (trip.vehicle.capacity) doc.text(`Capacité: ${trip.vehicle.capacity} tonnes`, 25, 144);
    
    doc.setFontSize(12);
    doc.text("Chargement", 20, 157);
    doc.setFontSize(10);
    doc.text(`Produit: ${trip.cargo.productName}`, 25, 164);
    doc.text(`Cartons: ${trip.cargo.boxesCount} x ${trip.cargo.piecesPerBox} pièces`, 25, 171);
    doc.text(`Total pièces: ${trip.cargo.totalPieces.toLocaleString()}`, 25, 178);
    if (trip.cargo.weight) doc.text(`Poids: ${trip.cargo.weight} kg`, 25, 185);
    if (trip.cargo.value) doc.text(`Valeur: ${formatCurrency(trip.cargo.value)}`, 25, 192);
    
    doc.setFontSize(12);
    doc.text("Coûts", 20, 205);
    doc.setFontSize(10);
    doc.text(`Carburant: ${formatCurrency(trip.fuelCost)}`, 25, 212);
    doc.text(`Péage: ${formatCurrency(trip.tollCost)}`, 25, 219);
    doc.text(`Autres: ${formatCurrency(trip.otherCosts)}`, 25, 226);
    doc.text(`Total: ${formatCurrency(trip.totalCost)}`, 25, 233);
    
    doc.setFontSize(10);
    doc.text("Ce document est un justificatif de transport", 105, 260, { align: "center" });
    doc.text(`Généré par: ${trip.createdByName}`, 105, 270, { align: "center" });
    
    doc.save(`trip-${trip.tripId}.pdf`);
  };

  const exportToCSV = () => {
    const headers = [
      "Trip ID", "Status", "Origin", "Destination", "Driver Name", "Driver Phone",
      "Plate Number", "Product", "Boxes", "Pieces/Box", "Total Pieces",
      "Departure Time", "Arrival Time", "Total Cost", "Created By"
    ];
    
    const rows = filteredTrips.map(trip => [
      trip.tripId,
      statusLabels[trip.status] || trip.status,
      trip.origin,
      trip.destination,
      trip.driver.name,
      trip.driver.phone,
      trip.vehicle.plateNumber,
      trip.cargo.productName,
      trip.cargo.boxesCount,
      trip.cargo.piecesPerBox,
      trip.cargo.totalPieces,
      formatDate(trip.departureTime),
      trip.actualArrivalTime ? formatDate(trip.actualArrivalTime) : "N/A",
      trip.totalCost,
      trip.createdByName,
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trips_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    setMessage("✅ Export CSV réussi");
    setTimeout(() => setMessage(null), 3000);
  };

  const updateEditForm = (field: keyof EditFormData, value: unknown) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const updateDriverField = (field: keyof EditDriver, value: string) => {
    setEditForm(prev => ({
      ...prev,
      driver: { ...prev.driver, [field]: value }
    }));
  };

  const updateVehicleField = (field: keyof EditVehicle, value: string | number) => {
    setEditForm(prev => ({
      ...prev,
      vehicle: { ...prev.vehicle, [field]: value }
    }));
  };

  const updateCargoField = (field: keyof EditCargo, value: number) => {
    setEditForm(prev => ({
      ...prev,
      cargo: { ...prev.cargo, [field]: value }
    }));
  };

  const openArrivalModal = (trip: CarTrip) => {
    setArrivalTrip(trip);
    setArrivalForm({
      arrivalDate: new Date().toISOString().slice(0, 10),
      receivedBoxes: trip.cargo.boxesCount,
      receivedPieces: trip.cargo.piecesPerBox,
      notes: "",
    });
    setShowArrivalModal(true);
  };

  const handleConfirmArrival = async () => {
    if (!arrivalTrip) return;

    if (arrivalForm.receivedBoxes < 0) {
      setError("Le nombre de cartons reçus ne peut pas être négatif");
      return;
    }
    if (arrivalForm.receivedPieces < 0) {
      setError("Le nombre de pièces reçues ne peut pas être négatif");
      return;
    }

    setArrivalSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/car-trips/${arrivalTrip._id}/confirm-arrival`, {
        method: "PATCH",
        body: JSON.stringify({
          actualArrivalTime: `${arrivalForm.arrivalDate}T12:00:00`,
          receivedBoxes: arrivalForm.receivedBoxes,
          receivedPieces: arrivalForm.receivedPieces,
          notes: arrivalForm.notes.trim(),
        }),
      });

      setMessage(`Arrivée confirmée pour le trajet ${arrivalTrip.tripId}`);
      setShowArrivalModal(false);
      setArrivalTrip(null);
      if (showModal && selectedTrip?._id === arrivalTrip._id) setShowModal(false);
      fetchTrips();
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la confirmation d'arrivée");
    } finally {
      setArrivalSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-7 h-7 text-blue-600" />
              Historique des Trajets
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestion et suivi de tous les trajets de camion
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
              onClick={fetchTrips}
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
                    <option value="planned">Planifié</option>
                    <option value="en_route">En Route</option>
                    <option value="delayed">Retardé</option>
                    <option value="arrived">Arrivé</option>
                    <option value="completed">Terminé</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaque</label>
                  <input
                    type="text"
                    value={plateFilter}
                    onChange={(e) => setPlateFilter(e.target.value)}
                    placeholder="Rechercher par plaque..."
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
                    setPlateFilter("");
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
            placeholder="Rechercher par ID, chauffeur, téléphone, plaque, origine, destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </div>
        </div>
        
        {/* Trips Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Liste des Trajets ({filteredTrips.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Chargement...</p>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun trajet trouvé</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Trajet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Chauffeur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itinéraire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pièces</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Départ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrips.map((trip) => (
                    <tr key={trip._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {trip.tripId}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[trip.status]}`}>
                          {getStatusIcon(trip.status)}
                          {statusLabels[trip.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{trip.driver.name}</div>
                        <div className="text-xs text-gray-500">{trip.driver.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{trip.origin}</div>
                        <div className="text-xs text-gray-500">→ {trip.destination}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {trip.cargo.productName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {trip.cargo.totalPieces.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(trip.departureTime)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => viewTripDetails(trip)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(trip)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openStatusModal(trip)}
                            className="text-green-600 hover:text-green-900"
                            title="Changer statut"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                          {(trip.status === "en_route" || trip.status === "delayed") && (
                            <button
                              onClick={() => openArrivalModal(trip)}
                              className="text-emerald-700 hover:text-emerald-900"
                              title="Confirmer l'arrivée"
                            >
                              <PackageCheck className="w-4 h-4" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTrip(trip)}
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
      
      {/* Trip Details Modal */}
      {showModal && selectedTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">Détails du Trajet</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Trip Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">ID Trajet</label>
                  <p className="text-sm font-medium text-gray-900">{selectedTrip.tripId}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Statut</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[selectedTrip.status]}`}>
                    {getStatusIcon(selectedTrip.status)}
                    {statusLabels[selectedTrip.status]}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Créé par</label>
                  <p className="text-sm text-gray-900">{selectedTrip.createdByName}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Créé le</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedTrip.createdAt)}</p>
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
                    <p className="text-xs text-blue-600">Départ</p>
                    <p className="font-medium">{selectedTrip.origin}</p>
                    <p className="text-sm text-gray-600">{formatDate(selectedTrip.departureTime)}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600">Destination</p>
                    <p className="font-medium">{selectedTrip.destination}</p>
                    <p className="text-sm text-gray-600">
                      Prévue: {formatDate(selectedTrip.expectedArrivalTime)}
                    </p>
                    {selectedTrip.actualArrivalTime && (
                      <p className="text-sm text-green-600">
                        Arrivée: {formatDate(selectedTrip.actualArrivalTime)}
                      </p>
                    )}
                  </div>
                </div>
                {selectedTrip.currentLocation && (
                  <div className="mt-3 bg-yellow-50 p-3 rounded-lg">
                    <p className="text-xs text-yellow-600">Position actuelle</p>
                    <p className="font-medium">{selectedTrip.currentLocation}</p>
                    <p className="text-xs text-gray-500">Dernière mise à jour: {formatDate(selectedTrip.lastUpdate)}</p>
                  </div>
                )}
              </div>
              
              {/* Driver & Vehicle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Chauffeur
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Nom:</span> {selectedTrip.driver.name}</p>
                    <p><span className="text-gray-500">Téléphone:</span> {selectedTrip.driver.phone}</p>
                    {selectedTrip.driver.licenseNumber && (
                      <p><span className="text-gray-500">Permis:</span> {selectedTrip.driver.licenseNumber}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" />
                    Véhicule
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Plaque:</span> {selectedTrip.vehicle.plateNumber}</p>
                    {selectedTrip.vehicle.model && <p><span className="text-gray-500">Modèle:</span> {selectedTrip.vehicle.model}</p>}
                    {selectedTrip.vehicle.capacity > 0 && <p><span className="text-gray-500">Capacité:</span> {selectedTrip.vehicle.capacity} tonnes</p>}
                  </div>
                </div>
              </div>
              
              {/* Cargo */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  Chargement
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Produit</p>
                    <p className="font-medium">{selectedTrip.cargo.productName}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Cartons</p>
                    <p className="font-medium">{selectedTrip.cargo.boxesCount}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Pièces/Carton</p>
                    <p className="font-medium">{selectedTrip.cargo.piecesPerBox}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Total Pièces</p>
                    <p className="font-medium">{selectedTrip.cargo.totalPieces.toLocaleString()}</p>
                  </div>
                  {selectedTrip.cargo.weight > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Poids</p>
                      <p className="font-medium">{selectedTrip.cargo.weight} kg</p>
                    </div>
                  )}
                  {selectedTrip.cargo.value > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">Valeur</p>
                      <p className="font-medium">{formatCurrency(selectedTrip.cargo.value)}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Costs */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  Coûts
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Carburant</p>
                    <p className="font-medium">{formatCurrency(selectedTrip.fuelCost)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Péage</p>
                    <p className="font-medium">{formatCurrency(selectedTrip.tollCost)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Autres</p>
                    <p className="font-medium">{formatCurrency(selectedTrip.otherCosts)}</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600">Total</p>
                    <p className="font-medium text-blue-700">{formatCurrency(selectedTrip.totalCost)}</p>
                  </div>
                </div>
              </div>
              
              {/* Arrival Details */}
              {selectedTrip.status === "arrived" && selectedTrip.arrivalDetails?.confirmedAt && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-green-600" />
                    Réception confirmée
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Confirmé le</p>
                        <p className="font-medium">{formatDate(selectedTrip.arrivalDetails.confirmedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Confirmé par</p>
                        <p className="font-medium">{selectedTrip.arrivalDetails.confirmedBy || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cartons reçus</p>
                        <p className="font-medium text-green-700">{selectedTrip.arrivalDetails.receivedBoxes}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pièces reçues/carton</p>
                        <p className="font-medium text-green-700">{selectedTrip.arrivalDetails.receivedPieces}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm border-t border-green-200 pt-3">
                      <span className="text-gray-600">Total pièces reçues:</span>
                      <span className="font-bold text-green-800 text-lg">
                        {selectedTrip.arrivalDetails.totalReceivedPieces.toLocaleString()}
                      </span>
                    </div>
                    {selectedTrip.arrivalDetails.totalReceivedPieces !== selectedTrip.cargo.totalPieces && (
                      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                        Différence: {(selectedTrip.arrivalDetails.totalReceivedPieces - selectedTrip.cargo.totalPieces).toLocaleString()} pièces
                        ({selectedTrip.arrivalDetails.totalReceivedPieces > selectedTrip.cargo.totalPieces ? "surplus" : "manquant"})
                      </div>
                    )}
                    {selectedTrip.arrivalDetails.notes && (
                      <p className="text-sm text-gray-600 italic">{selectedTrip.arrivalDetails.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedTrip.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedTrip.notes}</p>
                </div>
              )}
              
              {/* Edit History */}
              {selectedTrip.editHistory && selectedTrip.editHistory.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    Historique des modifications
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedTrip.editHistory.map((edit, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium">{edit.modifiedByName}</span>
                          <span className="text-gray-500">{formatDate(edit.modifiedAt)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{edit.reason}</p>
                        {edit.changes && Object.keys(edit.changes).length > 0 && (
                          <div className="text-xs text-gray-500">
                            Modifications: {Object.keys(edit.changes).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t flex-wrap">
                <button
                  onClick={() => generateTripPDF(selectedTrip)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={() => openEditModal(selectedTrip)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={() => openStatusModal(selectedTrip)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Changer statut
                </button>
                {(selectedTrip.status === "en_route" || selectedTrip.status === "delayed") && (
                  <button
                    onClick={() => { setShowModal(false); openArrivalModal(selectedTrip); }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                  >
                    <PackageCheck className="w-4 h-4" />
                    Confirmer l'arrivée
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Update Modal */}
      {showStatusModal && editingTrip && (
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
                  <option value="planned">Planifié</option>
                  <option value="en_route">En Route</option>
                  <option value="delayed">Retardé</option>
                  <option value="arrived">Arrivé</option>
                  <option value="completed">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position actuelle</label>
                <input
                  type="text"
                  value={statusUpdate.currentLocation}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, currentLocation: e.target.value })}
                  placeholder="Ex: À 50km de Lubumbashi"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
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
      
      {/* Arrival Confirmation Modal */}
      {showArrivalModal && arrivalTrip && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirmer l'arrivée</h3>
                <p className="text-sm text-gray-500">Trajet {arrivalTrip.tripId} — {arrivalTrip.origin} → {arrivalTrip.destination}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-sm">
              <p className="text-blue-700 font-medium">Chargement envoyé:</p>
              <p className="text-blue-600">
                {arrivalTrip.cargo.productName} — {arrivalTrip.cargo.boxesCount} cartons × {arrivalTrip.cargo.piecesPerBox} pièces
                = <strong>{arrivalTrip.cargo.totalPieces.toLocaleString()} pièces</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'arrivée *</label>
                <input
                  type="date"
                  value={arrivalForm.arrivalDate}
                  onChange={(e) => setArrivalForm(f => ({ ...f, arrivalDate: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cartons reçus *</label>
                  <input
                    type="number"
                    value={arrivalForm.receivedBoxes}
                    onChange={(e) => setArrivalForm(f => ({ ...f, receivedBoxes: parseInt(e.target.value) || 0 }))}
                    min="0"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pièces par carton reçu *</label>
                  <input
                    type="number"
                    value={arrivalForm.receivedPieces}
                    onChange={(e) => setArrivalForm(f => ({ ...f, receivedPieces: parseInt(e.target.value) || 0 }))}
                    min="0"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm flex justify-between items-center">
                <span className="text-gray-600">Total pièces reçues:</span>
                <span className="font-bold text-lg text-gray-900">
                  {(arrivalForm.receivedBoxes * arrivalForm.receivedPieces).toLocaleString()}
                </span>
              </div>

              {arrivalForm.receivedBoxes * arrivalForm.receivedPieces !== arrivalTrip.cargo.totalPieces && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Différence vs envoi: {((arrivalForm.receivedBoxes * arrivalForm.receivedPieces) - arrivalTrip.cargo.totalPieces).toLocaleString()} pièces
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes de réception</label>
                <textarea
                  value={arrivalForm.notes}
                  onChange={(e) => setArrivalForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="État de la marchandise, observations..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleConfirmArrival}
                disabled={arrivalSubmitting || !arrivalForm.arrivalDate}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {arrivalSubmitting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Enregistrement...</>
                ) : (
                  <><PackageCheck className="w-4 h-4" /> Confirmer l'arrivée</>
                )}
              </button>
              <button
                onClick={() => { setShowArrivalModal(false); setArrivalTrip(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Modifier le trajet</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Départ</label>
                  <input
                    type="text"
                    value={editForm.origin || ""}
                    onChange={(e) => updateEditForm("origin", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <input
                    type="text"
                    value={editForm.destination || ""}
                    onChange={(e) => updateEditForm("destination", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chauffeur</label>
                  <input
                    type="text"
                    value={editForm.driver?.name || ""}
                    onChange={(e) => updateDriverField("name", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={editForm.driver?.phone || ""}
                    onChange={(e) => updateDriverField("phone", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaque</label>
                  <input
                    type="text"
                    value={editForm.vehicle?.plateNumber || ""}
                    onChange={(e) => updateVehicleField("plateNumber", e.target.value.toUpperCase())}
                    className="w-full p-2 border border-gray-300 rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                  <input
                    type="text"
                    value={editForm.vehicle?.model || ""}
                    onChange={(e) => updateVehicleField("model", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cartons</label>
                  <input
                    type="number"
                    value={editForm.cargo?.boxesCount || 1}
                    onChange={(e) => updateCargoField("boxesCount", parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pièces/Carton</label>
                  <input
                    type="number"
                    value={editForm.cargo?.piecesPerBox || 1}
                    onChange={(e) => updateCargoField("piecesPerBox", parseInt(e.target.value) || 1)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valeur (USD)</label>
                  <input
                    type="number"
                    value={editForm.cargo?.value || 0}
                    onChange={(e) => updateCargoField("value", parseFloat(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Départ</label>
                  <input
                    type="datetime-local"
                    value={editForm.departureTime || ""}
                    onChange={(e) => updateEditForm("departureTime", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Arrivée prévue</label>
                  <input
                    type="datetime-local"
                    value={editForm.expectedArrivalTime || ""}
                    onChange={(e) => updateEditForm("expectedArrivalTime", e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison de modification *</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Veuillez expliquer pourquoi vous modifiez ce trajet..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEditTrip}
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
