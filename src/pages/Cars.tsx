// components/Cars.tsx
import React, { useState } from "react";
import { apiFetch } from "../services/authService";
import {
  Truck,
  MapPin,
  User,
  Package,
  Calendar,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface CarTripForm {
  origin: string;
  destination: string;
  driver: { name: string; phone: string; licenseNumber: string };
  vehicle: { plateNumber: string; model: string; capacity: number };
  cargo: { productName: string; boxesCount: number; piecesPerBox: number; weight: number };
  departureDate: string;
  notes: string;
}

const EMPTY_FORM: CarTripForm = {
  origin: "",
  destination: "",
  driver: { name: "", phone: "", licenseNumber: "" },
  vehicle: { plateNumber: "", model: "", capacity: 0 },
  cargo: { productName: "", boxesCount: 1, piecesPerBox: 1, weight: 0 },
  departureDate: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function Cars() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CarTripForm>(EMPTY_FORM);

  const totalPieces = form.cargo.boxesCount * form.cargo.piecesPerBox;

  const setStr = (path: string, value: string) => {
    const [parent, child] = path.split(".");
    if (child) {
      setForm((prev) => ({
        ...prev,
        [parent]: { ...((prev as unknown as Record<string, unknown>)[parent] as object), [child]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [path]: value }));
    }
  };

  const setNum = (path: string, value: number) => {
    const [parent, child] = path.split(".");
    if (child) {
      setForm((prev) => ({
        ...prev,
        [parent]: { ...((prev as unknown as Record<string, unknown>)[parent] as object), [child]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [path]: value }));
    }
  };

  const validate = (): string | null => {
    if (!form.origin.trim()) return "Veuillez saisir le lieu de départ";
    if (!form.destination.trim()) return "Veuillez saisir la destination";
    if (!form.driver.name.trim()) return "Veuillez saisir le nom du chauffeur";
    if (!form.driver.phone.trim()) return "Veuillez saisir le téléphone du chauffeur";
    if (!form.vehicle.plateNumber.trim()) return "Veuillez saisir le numéro de plaque";
    if (!form.cargo.productName.trim()) return "Veuillez saisir le nom du produit";
    if (form.cargo.boxesCount < 1) return "Le nombre de cartons doit être au moins 1";
    if (form.cargo.piecesPerBox < 1) return "Le nombre de pièces par carton doit être au moins 1";
    if (!form.departureDate) return "Veuillez saisir la date de départ";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch("/cars", {
        method: "POST",
        body: JSON.stringify({
          origin: form.origin.trim(),
          destination: form.destination.trim(),
          driver: {
            name: form.driver.name.trim(),
            phone: form.driver.phone.trim(),
            licenseNumber: form.driver.licenseNumber.trim(),
          },
          vehicle: {
            plateNumber: form.vehicle.plateNumber.trim().toUpperCase(),
            model: form.vehicle.model.trim(),
            capacity: form.vehicle.capacity,
          },
          cargo: {
            productName: form.cargo.productName.trim(),
            boxesCount: form.cargo.boxesCount,
            piecesPerBox: form.cargo.piecesPerBox,
            weight: form.cargo.weight,
          },
          departureTime: `${form.departureDate}T06:00:00`,
          notes: form.notes.trim(),
        }),
      });

      setMessage("Trajet enregistré avec succès ! Le camion est en route.");
      setForm({ ...EMPTY_FORM, departureDate: new Date().toISOString().slice(0, 10) });
      window.dispatchEvent(new Event("tripCreated"));
      setTimeout(() => setMessage(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 outline-none";
  const labelCls = "block mb-2 font-medium text-blue-200";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-1">
            <Truck className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Nouveau Départ de Camion</h1>
          </div>
          <p className="text-blue-200/70">
            Enregistrez le départ. L'arrivée et la réception seront confirmées dans l'historique.
          </p>
        </div>

        {message && (
          <div className="p-4 bg-green-900/50 border border-green-700/50 text-green-300 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700/50 text-red-300 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Route */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <MapPin className="w-5 h-5" /> Itinéraire
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Lieu de départ *</label>
                <input
                  type="text"
                  value={form.origin}
                  onChange={(e) => setStr("origin", e.target.value)}
                  placeholder="Ex: Lubumbashi"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Destination *</label>
                <input
                  type="text"
                  value={form.destination}
                  onChange={(e) => setStr("destination", e.target.value)}
                  placeholder="Ex: Kinshasa"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Departure date */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <Calendar className="w-5 h-5" /> Date de départ
            </h2>
            <div className="max-w-xs">
              <label className={labelCls}>Jour du départ *</label>
              <input
                type="date"
                value={form.departureDate}
                onChange={(e) => setStr("departureDate", e.target.value)}
                className={inputCls}
              />
              <p className="mt-1 text-xs text-blue-300/50">
                L'heure exacte sera enregistrée au moment de la soumission. L'arrivée est confirmée séparément.
              </p>
            </div>
          </section>

          {/* Driver */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <User className="w-5 h-5" /> Chauffeur
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelCls}>Nom complet *</label>
                <input
                  type="text"
                  value={form.driver.name}
                  onChange={(e) => setStr("driver.name", e.target.value)}
                  placeholder="Nom du chauffeur"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Téléphone *</label>
                <input
                  type="tel"
                  value={form.driver.phone}
                  onChange={(e) => setStr("driver.phone", e.target.value)}
                  placeholder="+243 XXX XXX XXX"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>N° Permis</label>
                <input
                  type="text"
                  value={form.driver.licenseNumber}
                  onChange={(e) => setStr("driver.licenseNumber", e.target.value)}
                  placeholder="Numéro de permis"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Vehicle */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <Truck className="w-5 h-5" /> Véhicule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelCls}>N° de plaque *</label>
                <input
                  type="text"
                  value={form.vehicle.plateNumber}
                  onChange={(e) => setStr("vehicle.plateNumber", e.target.value)}
                  placeholder="Ex: LU 1234 A"
                  className={`${inputCls} uppercase`}
                />
              </div>
              <div>
                <label className={labelCls}>Modèle</label>
                <input
                  type="text"
                  value={form.vehicle.model}
                  onChange={(e) => setStr("vehicle.model", e.target.value)}
                  placeholder="Ex: Mercedes Actros"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Capacité (tonnes)</label>
                <input
                  type="number"
                  value={form.vehicle.capacity || ""}
                  onChange={(e) => setNum("vehicle.capacity", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {/* Cargo */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <Package className="w-5 h-5" /> Chargement envoyé
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Désignation du produit *</label>
                <input
                  type="text"
                  value={form.cargo.productName}
                  onChange={(e) => setStr("cargo.productName", e.target.value)}
                  placeholder="Ex: Ciment Portland, Farine de blé..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Nombre de cartons *</label>
                <input
                  type="number"
                  value={form.cargo.boxesCount}
                  onChange={(e) => setNum("cargo.boxesCount", parseInt(e.target.value) || 1)}
                  min="1"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Pièces par carton *</label>
                <input
                  type="number"
                  value={form.cargo.piecesPerBox}
                  onChange={(e) => setNum("cargo.piecesPerBox", parseInt(e.target.value) || 1)}
                  min="1"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Poids total (kg)</label>
                <input
                  type="number"
                  value={form.cargo.weight || ""}
                  onChange={(e) => setNum("cargo.weight", parseFloat(e.target.value) || 0)}
                  min="0"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 bg-blue-950/40 rounded-lg p-4 border border-blue-800/30 grid grid-cols-3 gap-4 text-sm text-center">
              <div>
                <p className="text-blue-300">Cartons</p>
                <p className="text-white font-bold text-lg">{form.cargo.boxesCount}</p>
              </div>
              <div>
                <p className="text-blue-300">Pcs/carton</p>
                <p className="text-white font-bold text-lg">{form.cargo.piecesPerBox}</p>
              </div>
              <div>
                <p className="text-blue-300">Total pièces</p>
                <p className="text-white font-bold text-lg">{totalPieces.toLocaleString()}</p>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <label className={labelCls}>Notes supplémentaires</label>
            <textarea
              value={form.notes}
              onChange={(e) => setStr("notes", e.target.value)}
              rows={3}
              placeholder="Informations supplémentaires sur le trajet..."
              className={inputCls}
            />
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 shadow-lg border border-blue-400/30 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Enregistrer le départ
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
