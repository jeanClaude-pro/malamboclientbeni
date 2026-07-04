"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ArrowDownToLine,
  Calendar,
  Package,
  MapPin,
  User,
  FileText,
  Hash,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";

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
  productId: string;
  cartonQuantity: number;
  looseQuantity: number;
  sourceLocation: string;
  transferReference: string;
  deliveredBy: string;
  receivedBy: string;
  notes: string;
}

const EMPTY_FORM: ReceptionForm = {
  productId: "",
  cartonQuantity: 0,
  looseQuantity: 0,
  sourceLocation: "",
  transferReference: "",
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
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ReceptionForm>(EMPTY_FORM);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list: Product[] = Array.isArray(data) ? data : (data.data || []);
        setProducts(list.filter((p) => p.status !== "inactive"));
      }
    } catch {
      // silent — products remain empty
    } finally {
      setLoadingProducts(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setForm((prev) => ({ ...prev, productId: product._id }));
    setProductSearch(product.name);
    setShowDropdown(false);
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setForm((prev) => ({ ...prev, productId: "", cartonQuantity: 0, looseQuantity: 0 }));
    setProductSearch("");
  };

  const piecesPerCarton = selectedProduct
    ? Math.max(1, Math.floor(Number(selectedProduct.piecesPerCarton || 1)))
    : 1;

  const totalPieces = form.cartonQuantity * piecesPerCarton + form.looseQuantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!form.productId) { setError("Veuillez sélectionner un produit"); return; }
    if (totalPieces <= 0) { setError("La quantité reçue doit être supérieure à zéro"); return; }
    if (form.looseQuantity >= piecesPerCarton) {
      setError(`Les pièces vrac doivent être inférieures à ${piecesPerCarton}`); return;
    }
    if (!form.sourceLocation.trim()) { setError("La provenance est requise"); return; }
    if (!form.transferReference.trim()) { setError("Le numéro de référence est requis"); return; }
    if (!form.deliveredBy.trim()) { setError("Le nom du livreur est requis"); return; }
    if (!form.receivedBy.trim()) { setError("Le nom du récepteur est requis"); return; }

    try {
      setSubmitting(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/transfer-receptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({
          ...form,
          ...(isAdmin && operationDate && operationDate !== getTodayDate() && {
            operationDate,
          }),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`✅ Réception enregistrée avec succès — ${data.data.receptionId}`);
        const newReceivedBy = currentUser?.username || "";
        setForm({ ...EMPTY_FORM, receivedBy: newReceivedBy });
        setSelectedProduct(null);
        setProductSearch("");
        window.dispatchEvent(new CustomEvent("productsUpdated"));
        window.dispatchEvent(new CustomEvent("salesUpdated"));
        window.dispatchEvent(new CustomEvent("transferReceptionUpdated"));
        fetchProducts();
      } else {
        setError(data.error || "Échec de l'enregistrement de la réception");
      }
    } catch {
      setError("Erreur de connexion au serveur");
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
              Réception de Transfert
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Enregistrer les produits reçus d'un transfert entrant
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

          {/* Product Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Produit reçu
            </h2>

            {/* Product search */}
            <div ref={dropdownRef} className="relative">
              <label className={labelClass}>Sélectionner un produit *</label>
              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setShowDropdown(true);
                    if (selectedProduct && e.target.value !== selectedProduct.name) clearProduct();
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={loadingProducts ? "Chargement..." : "Rechercher un produit..."}
                  className={inputClass + " pr-8"}
                  autoComplete="off"
                />
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {showDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {filteredProducts.slice(0, 40).map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => selectProduct(p)}
                      className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition-colors border-b border-gray-50 last:border-0 flex items-center justify-between gap-2"
                    >
                      <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatStock(p.stock, p.piecesPerCarton)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && productSearch.length > 0 && filteredProducts.length === 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-sm text-gray-500 text-center">
                  Aucun produit trouvé
                </div>
              )}
            </div>

            {/* Selected product info */}
            {selectedProduct && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-blue-900">{selectedProduct.name}</p>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    {selectedProduct.piecesPerCarton} pcs/carton
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Stock actuel:{" "}
                  <strong>{formatStock(selectedProduct.stock, selectedProduct.piecesPerCarton)}</strong>
                </p>
              </div>
            )}

            {/* Quantities */}
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
                  {selectedProduct && piecesPerCarton > 1
                    ? `(0 – ${piecesPerCarton - 1})`
                    : ""}
                </label>
                <input
                  type="number"
                  min={0}
                  max={selectedProduct ? piecesPerCarton - 1 : undefined}
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

            {/* Preview */}
            {selectedProduct && totalPieces > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                <p className="text-sm text-green-800">
                  Quantité reçue:{" "}
                  <strong>{formatStock(totalPieces, piecesPerCarton)}</strong>
                </p>
                <p className="text-xs text-green-700">
                  Stock après réception:{" "}
                  <strong>
                    {formatStock(selectedProduct.stock + totalPieces, piecesPerCarton)}
                  </strong>
                  {" "}(actuellement {formatStock(selectedProduct.stock, piecesPerCarton)}{" "}
                  + {formatStock(totalPieces, piecesPerCarton)})
                </p>
              </div>
            )}
          </div>

          {/* Transfer Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Informations du transfert
            </h2>

            <div>
              <label className={labelClass}>
                <MapPin className="inline w-3.5 h-3.5 mr-1 text-gray-500" />
                Provenance (agence / entrepôt) *
              </label>
              <input
                type="text"
                value={form.sourceLocation}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sourceLocation: e.target.value }))
                }
                placeholder="Ex: Dépôt Central Goma, Agence Beni..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <Hash className="inline w-3.5 h-3.5 mr-1 text-gray-500" />
                Numéro de référence du transfert *
              </label>
              <input
                type="text"
                value={form.transferReference}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, transferReference: e.target.value }))
                }
                placeholder="Ex: TRF-20260705-ABC123"
                className={inputClass}
              />
            </div>
          </div>

          {/* People */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              Personnes concernées
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Livré par *</label>
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
            disabled={submitting || !form.productId || totalPieces <= 0}
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
