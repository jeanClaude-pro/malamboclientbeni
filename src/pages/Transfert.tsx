// pages/Transfert.tsx
import React, { useEffect, useState } from "react";
import { apiFetch } from "../services/authService";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowLeftRight,
  Calendar,
  MapPin,
  Package,
  User,
  Truck,
  Building2,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Product {
  _id: string;
  name: string;
  piecesPerCarton?: number;
  stock?: number;
}

function formatStockCartons(totalPieces: number, piecesPerCarton: number) {
  const perCarton = Math.max(1, Math.floor(Number(piecesPerCarton || 1)));
  const safeTotal = Math.max(0, Math.floor(Number(totalPieces || 0)));
  const cartons = Math.floor(safeTotal / perCarton);
  const pieces = safeTotal % perCarton;
  return pieces > 0
    ? `${cartons.toLocaleString()} carton${cartons !== 1 ? "s" : ""} et ${pieces.toLocaleString()} pièce${pieces !== 1 ? "s" : ""}`
    : `${cartons.toLocaleString()} carton${cartons !== 1 ? "s" : ""}`;
}

interface TransferForm {
  sourceLocation: string;
  product: {
    productId: string;
    name: string;
    cartonQuantity: number;
    looseQuantity: number;
    piecesPerCarton: number;
  };
  destinationAgency: string;
  receiver: { name: string; phone: string };
  transport: {
    driverName: string;
    vehiclePlate: string;
    transportCompany: string;
    deliveryNotes: string;
  };
  notes: string;
}

const EMPTY_FORM: TransferForm = {
  sourceLocation: "",
  product: { productId: "", name: "", cartonQuantity: 0, looseQuantity: 0, piecesPerCarton: 1 },
  destinationAgency: "",
  receiver: { name: "", phone: "" },
  transport: { driverName: "", vehiclePlate: "", transportCompany: "", deliveryNotes: "" },
  notes: "",
};

export default function Transfert() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [operationDate, setOperationDate] = useState(getTodayDate());
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TransferForm>(EMPTY_FORM);

  useEffect(() => {
    apiFetch<Product[]>("/products")
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);

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
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p._id === productId);
    setForm((prev) => ({
      ...prev,
      product: {
        ...prev.product,
        productId,
        name: product?.name || "",
        piecesPerCarton: Math.max(1, Number(product?.piecesPerCarton || 1)),
      },
    }));
  };

  const selectedProduct = products.find((p) => p._id === form.product.productId);
  const availableStock = Number(selectedProduct?.stock || 0);
  const requestedPieces =
    form.product.cartonQuantity * form.product.piecesPerCarton + form.product.looseQuantity;
  const exceedsStock = !!selectedProduct && requestedPieces > availableStock;

  const hasTransportInfo =
    (form.transport.driverName.trim() && form.transport.vehiclePlate.trim()) ||
    form.transport.transportCompany.trim();

  const validate = (): string | null => {
    if (!form.sourceLocation.trim()) return "Veuillez saisir le lieu de provenance";
    if (!form.product.productId) return "Veuillez sélectionner un article existant de l'inventaire";
    if (form.product.cartonQuantity <= 0 && form.product.looseQuantity <= 0) {
      return "Veuillez saisir une quantité de cartons ou de pièces à transférer";
    }
    if (exceedsStock) {
      return `Stock insuffisant. Disponible: ${formatStockCartons(availableStock, form.product.piecesPerCarton)}`;
    }
    if (!form.destinationAgency.trim()) return "Veuillez saisir l'agence de destination";
    if (!hasTransportInfo) {
      return "Veuillez indiquer le chauffeur et la plaque du véhicule, ou une société de transport";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch("/transfers", {
        method: "POST",
        body: JSON.stringify({
          sourceLocation: form.sourceLocation.trim(),
          product: {
            productId: form.product.productId,
            name: form.product.name.trim(),
            cartonQuantity: form.product.cartonQuantity,
            looseQuantity: form.product.looseQuantity,
            piecesPerCarton: form.product.piecesPerCarton,
          },
          destinationAgency: form.destinationAgency.trim(),
          receiver: {
            name: form.receiver.name.trim(),
            phone: form.receiver.phone.trim(),
          },
          transport: {
            driverName: form.transport.driverName.trim(),
            vehiclePlate: form.transport.vehiclePlate.trim().toUpperCase(),
            transportCompany: form.transport.transportCompany.trim(),
            deliveryNotes: form.transport.deliveryNotes.trim(),
          },
          notes: form.notes.trim(),
          ...(isAdmin && operationDate && operationDate !== getTodayDate() && {
            operationDate,
          }),
        }),
      });

      setMessage("Transfert enregistré avec succès !");
      setForm(EMPTY_FORM);
      window.dispatchEvent(new Event("transferCreated"));
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
            <ArrowLeftRight className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Nouveau Transfert</h1>
          </div>
          <p className="text-blue-200/70">
            Enregistrez le transfert d'articles vers une autre agence avec ses informations de
            transport.
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
          {/* Source */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <MapPin className="w-5 h-5" /> Provenance
            </h2>
            <div className="max-w-md">
              <label className={labelCls}>Lieu de provenance *</label>
              <input
                type="text"
                value={form.sourceLocation}
                onChange={(e) => setStr("sourceLocation", e.target.value)}
                placeholder="Ex: Entrepôt principal Lubumbashi"
                className={inputCls}
              />
            </div>
          </section>

          {/* Product */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <Package className="w-5 h-5" /> Article à transférer
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Sélectionner un article *</label>
                <select
                  value={form.product.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className={inputCls}
                >
                  <option value="" className="bg-gray-900">— Choisir un article de l'inventaire —</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id} className="bg-gray-900">
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className="mt-1 text-xs text-blue-300/70">
                    Stock disponible: {formatStockCartons(availableStock, form.product.piecesPerCarton)}
                  </p>
                )}
                <p className="mt-1 text-xs text-blue-300/50">
                  Seul un article existant de l'inventaire peut être transféré, afin que le stock
                  soit déduit automatiquement.
                </p>
              </div>
              <div>
                <label className={labelCls}>Désignation</label>
                <input
                  type="text"
                  value={form.product.name}
                  readOnly
                  placeholder="Sélectionnez un article ci-contre"
                  className={`${inputCls} cursor-not-allowed opacity-80`}
                />
              </div>
              <div>
                <label className={labelCls}>Cartons</label>
                <input
                  type="number"
                  value={form.product.cartonQuantity}
                  onChange={(e) => setNum("product.cartonQuantity", parseInt(e.target.value) || 0)}
                  min="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Pièces (hors carton)</label>
                <input
                  type="number"
                  value={form.product.looseQuantity}
                  onChange={(e) => setNum("product.looseQuantity", parseInt(e.target.value) || 0)}
                  min="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Pièces par carton</label>
                <input
                  type="number"
                  value={form.product.piecesPerCarton}
                  onChange={(e) => setNum("product.piecesPerCarton", parseInt(e.target.value) || 1)}
                  min="1"
                  className={inputCls}
                />
              </div>
            </div>

            {exceedsStock && (
              <p className="mt-3 text-sm text-red-300 bg-red-900/30 border border-red-700/40 rounded-lg p-3">
                Stock insuffisant pour "{selectedProduct?.name}". Disponible:{" "}
                {formatStockCartons(availableStock, form.product.piecesPerCarton)}.
              </p>
            )}

            <div className="mt-4 bg-blue-950/40 rounded-lg p-4 border border-blue-800/30 flex items-center justify-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-blue-300">Cartons à transférer</p>
                <p className="text-white font-bold text-lg">
                  {form.product.cartonQuantity.toLocaleString()} carton
                  {form.product.cartonQuantity > 1 ? "s" : ""}
                </p>
              </div>
              {form.product.looseQuantity > 0 && (
                <>
                  <span className="text-blue-400 text-lg">+</span>
                  <div className="text-center">
                    <p className="text-blue-300">Pièces hors carton</p>
                    <p className="text-white font-bold text-lg">
                      {form.product.looseQuantity.toLocaleString()} pièce
                      {form.product.looseQuantity > 1 ? "s" : ""}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Transfer Information — destination, receiver & transport */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <ArrowLeftRight className="w-5 h-5" /> Informations sur le transfert
            </h2>

            {/* Destination agency */}
            <div className="mb-6">
              <p className="font-medium text-blue-300 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Agence de destination
              </p>
              <div className="max-w-md">
                <label className={labelCls}>Agence destinataire *</label>
                <input
                  type="text"
                  value={form.destinationAgency}
                  onChange={(e) => setStr("destinationAgency", e.target.value)}
                  placeholder="Ex: Agence Kinshasa"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Receiver */}
            <div className="mb-6">
              <p className="font-medium text-blue-300 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Personne réceptionnant les articles (le cas échéant)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Nom du réceptionnaire</label>
                  <input
                    type="text"
                    value={form.receiver.name}
                    onChange={(e) => setStr("receiver.name", e.target.value)}
                    placeholder="Nom de la personne qui réceptionne"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Téléphone du réceptionnaire</label>
                  <input
                    type="tel"
                    value={form.receiver.phone}
                    onChange={(e) => setStr("receiver.phone", e.target.value)}
                    placeholder="+243 XXX XXX XXX"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Transport */}
            <div>
              <p className="font-medium text-blue-300 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Détails du transport
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelCls}>Nom du chauffeur</label>
                  <input
                    type="text"
                    value={form.transport.driverName}
                    onChange={(e) => setStr("transport.driverName", e.target.value)}
                    placeholder="Nom du chauffeur"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Plaque du véhicule</label>
                  <input
                    type="text"
                    value={form.transport.vehiclePlate}
                    onChange={(e) => setStr("transport.vehiclePlate", e.target.value)}
                    placeholder="Ex: LU 1234 A"
                    className={`${inputCls} uppercase`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Société de transport (si applicable)</label>
                  <input
                    type="text"
                    value={form.transport.transportCompany}
                    onChange={(e) => setStr("transport.transportCompany", e.target.value)}
                    placeholder="Ex: Trans-Kivu SARL"
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Notes de livraison</label>
                  <textarea
                    value={form.transport.deliveryNotes}
                    onChange={(e) => setStr("transport.deliveryNotes", e.target.value)}
                    rows={3}
                    placeholder="Instructions particulières pour la livraison..."
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-300/50">
                Indiquez le chauffeur et la plaque du véhicule, ou une société de transport (l'un des
                deux est requis).
              </p>
            </div>
          </section>

          {/* Notes */}
          <section className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl p-6 border border-blue-800/50 shadow-xl">
            <label className={labelCls}>Notes supplémentaires</label>
            <textarea
              value={form.notes}
              onChange={(e) => setStr("notes", e.target.value)}
              rows={3}
              placeholder="Informations supplémentaires sur le transfert..."
              className={inputCls}
            />
          </section>

          {isAdmin && (
            <section className="bg-gradient-to-br from-amber-950 to-orange-950 rounded-xl p-5 border border-amber-700/50 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-amber-300">Date de l'opération (Admin)</h3>
              </div>
              <input
                type="date"
                value={operationDate}
                max={getTodayDate()}
                onChange={(e) => setOperationDate(e.target.value)}
                className="w-full p-3 bg-black/30 border border-amber-700/50 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="mt-2 text-xs text-amber-300/80">
                Ce transfert sera enregistré et comptabilisé à cette date dans l'historique et les rapports.
              </p>
            </section>
          )}

          <button
            type="submit"
            disabled={submitting || exceedsStock}
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
                Enregistrer le transfert
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
