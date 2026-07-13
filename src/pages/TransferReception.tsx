"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowDownToLine,
  Calendar,
  Package,
  User,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch } from "../services/authService";

interface Product {
  _id: string;
  name: string;
  stock: number;
  piecesPerCarton: number;
  category?: string;
  status?: string;
}

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface ReceptionForm {
  cartonQuantity: number;
  looseQuantity: number;
  deliveredBy: string;
  receivedBy: string;
  notes: string;
}

const EMPTY_FORM: ReceptionForm = {
  cartonQuantity: 0,
  looseQuantity: 0,
  deliveredBy: "",
  receivedBy: "",
  notes: "",
};

function formatStock(totalPieces: number, piecesPerCarton: number): string {
  const ppc = Math.max(1, Math.floor(Number(piecesPerCarton || 1)));
  const total = Math.max(0, Math.floor(Number(totalPieces || 0)));
  if (ppc <= 1) return `${total} pièce${total !== 1 ? "s" : ""}`;
  const cartons = Math.floor(total / ppc);
  const pieces = total % ppc;
  if (pieces === 0) return `${cartons} carton${cartons !== 1 ? "s" : ""}`;
  return `${cartons} carton${cartons !== 1 ? "s" : ""} et ${pieces} pièce${pieces !== 1 ? "s" : ""}`;
}

export default function TransferReception() {
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ReceptionForm>(EMPTY_FORM);

  // The receiver picks the product themselves and records where it came from.
  const [productId, setProductId] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [transferReference, setTransferReference] = useState("");

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const isAdmin = currentUser?.role === "admin";
  const [operationDate, setOperationDate] = useState(getTodayDate());

  useEffect(() => {
    fetchProducts();
    if (currentUser?.username) {
      setForm((prev) => ({ ...prev, receivedBy: currentUser.username }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await apiFetch<Product[] | { data: Product[] }>("/products");
      const list: Product[] = Array.isArray(data) ? data : (data.data || []);
      setProducts(list);
    } catch {
      // apiFetch already redirects to /login if the session expired; otherwise the stock preview just won't be available
    }
  };

  useEffect(() => {
    const handleDataChange = () => {
      void fetchProducts();
    };
    window.addEventListener("appDataChanged", handleDataChange);
    return () => window.removeEventListener("appDataChanged", handleDataChange);
  }, []);

  const product = products.find((p) => p._id === productId);
  const piecesPerCarton = product ? Math.max(1, Math.floor(Number(product.piecesPerCarton || 1))) : 1;
  const totalPieces = form.cartonQuantity * piecesPerCarton + form.looseQuantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!productId) { setError("Veuillez sélectionner le produit reçu"); return; }
    if (!sourceLocation.trim()) { setError("Veuillez indiquer la provenance de la livraison"); return; }
    if (totalPieces <= 0) { setError("La quantité reçue doit être supérieure à zéro"); return; }
    if (form.looseQuantity >= piecesPerCarton) {
      setError(`Les pièces vrac doivent être inférieures à ${piecesPerCarton}`); return;
    }
    if (!form.receivedBy.trim()) { setError("Le nom du récepteur est requis"); return; }

    try {
      setSubmitting(true);
      const data = await apiFetch<{ success: boolean; data: { receptionId: string } }>(
        "/transfer-receptions",
        {
          method: "POST",
          body: JSON.stringify({
            productId,
            sourceLocation: sourceLocation.trim(),
            transferReference: transferReference.trim(),
            cartonQuantity: form.cartonQuantity,
            looseQuantity: form.looseQuantity,
            deliveredBy: form.deliveredBy.trim(),
            receivedBy: form.receivedBy.trim(),
            notes: form.notes.trim(),
            ...(isAdmin && operationDate && operationDate !== getTodayDate() && {
              operationDate,
            }),
          }),
        }
      );

      setMessage(`✅ Réception enregistrée avec succès — ${data.data.receptionId}`);
      const newReceivedBy = currentUser?.username || "";
      setForm({ ...EMPTY_FORM, receivedBy: newReceivedBy });
      setProductId("");
      setSourceLocation("");
      setTransferReference("");
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion au serveur");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm bg-white transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <ArrowDownToLine className="w-6 h-6 text-green-600" />
              </div>
              Réception Directe
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Choisissez le produit reçu et la provenance de la livraison
            </p>
          </div>
          <Link
            to="/transfer-reception-history"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <History className="w-4 h-4" />
            Historique
          </Link>
        </div>

        {/* Feedback */}
        {message && (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Reception selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Ce qui est reçu
            </h2>

            <div>
              <label className={labelClass}>Produit reçu *</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Choisir un article de l'inventaire —</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Provenance de la livraison *</label>
              <input
                type="text"
                value={sourceLocation}
                onChange={(e) => setSourceLocation(e.target.value)}
                placeholder="Ex: Fournisseur XYZ, Entrepôt central..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Référence (bon de livraison, facture...)</label>
              <input
                type="text"
                value={transferReference}
                onChange={(e) => setTransferReference(e.target.value)}
                placeholder="Optionnel"
                className={inputClass}
              />
            </div>

            {product && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-blue-900">{product.name}</p>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      {piecesPerCarton} pcs/carton
                    </span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Stock actuel: <strong>{formatStock(product.stock, piecesPerCarton)}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Cartons reçus *</label>
                    <input
                      type="number"
                      min={0}
                      value={form.cartonQuantity}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cartonQuantity: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Pièces vrac{" "}
                      {piecesPerCarton > 1 ? `(0 – ${piecesPerCarton - 1})` : ""}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={piecesPerCarton - 1}
                      value={form.looseQuantity}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          looseQuantity: Math.max(0, parseInt(e.target.value) || 0),
                        }))
                      }
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                </div>

                {totalPieces > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                    <p className="text-sm text-green-800">
                      Quantité reçue: <strong>{formatStock(totalPieces, piecesPerCarton)}</strong>
                    </p>
                    <p className="text-xs text-green-700">
                      Stock après réception:{" "}
                      <strong>{formatStock(product.stock + totalPieces, piecesPerCarton)}</strong>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* People */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              Personnes concernées
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Livré par</label>
                <input
                  type="text"
                  value={form.deliveredBy}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, deliveredBy: e.target.value }))
                  }
                  placeholder="Nom du livreur / chauffeur"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Réceptionné par *</label>
                <input
                  type="text"
                  value={form.receivedBy}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, receivedBy: e.target.value }))
                  }
                  placeholder="Nom du récepteur"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Remarques / Observations</label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="État des produits, observations particulières..."
                rows={3}
                className={inputClass + " resize-none"}
              />
            </div>
          </div>

          {/* Date de l'opération — Admin uniquement */}
          {isAdmin && (
            <div className="bg-gradient-to-br from-amber-950 to-orange-950 rounded-xl p-5 border border-amber-700/50 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-amber-300">Date de l'opération (Admin)</h3>
              </div>
              <input
                type="date"
                value={operationDate}
                max={getTodayDate()}
                onChange={(e) => setOperationDate(e.target.value)}
                className={inputClass}
              />
              <p className="mt-2 text-xs text-amber-300/80">
                Cette réception sera enregistrée et comptabilisée à cette date dans l'historique et les rapports.
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || totalPieces <= 0 || !productId}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3.5 rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Enregistrement en cours...
              </>
            ) : (
              <>
                <ArrowDownToLine className="w-5 h-5" />
                Enregistrer la réception
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
