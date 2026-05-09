// components/Cars.tsx
import React, { useState, useEffect } from "react";
import { apiFetch } from "../services/authService";
import { 
  Truck, 
  MapPin, 
  User, 
  Package, 
  Calendar, 
  DollarSign,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface Product {
  _id: string;
  name: string;
  stock: number;
  price?: number;
}

interface CarTrip {
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
    boxesCount: number;
    piecesPerBox: number;
    weight: number;
    value: number;
  };
  departureTime: string;
  expectedArrivalTime: string;
  fuelCost: number;
  tollCost: number;
  otherCosts: number;
  notes: string;
}

type ProductsResponse = Product[] | { products?: Product[] };

export default function Cars() {
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState<CarTrip>({
    origin: "",
    destination: "",
    driver: {
      name: "",
      phone: "",
      licenseNumber: "",
    },
    vehicle: {
      plateNumber: "",
      model: "",
      capacity: 0,
    },
    cargo: {
      productId: "",
      boxesCount: 1,
      piecesPerBox: 1,
      weight: 0,
      value: 0,
    },
    departureTime: "",
    expectedArrivalTime: "",
    fuelCost: 0,
    tollCost: 0,
    otherCosts: 0,
    notes: "",
  });

  // Load products
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await apiFetch<ProductsResponse>("/products");
      const productsList = Array.isArray(data) ? data : data.products || [];
      setProducts(productsList);
    } catch (error) {
      console.error("Error loading products:", error);
      setError(getErrorMessage(error, "Erreur lors du chargement des produits"));
    }
  };

  const totalPieces = form.cargo.boxesCount * form.cargo.piecesPerBox;
  const totalCost = form.fuelCost + form.tollCost + form.otherCosts;

  const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setForm(prev => updateNestedFormValue(prev, parent, child, value));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === "" ? 0 : parseFloat(value);
    
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setForm(prev => updateNestedFormValue(prev, parent, child, numValue));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: numValue,
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!form.origin.trim()) {
      setError("Veuillez saisir le lieu de départ");
      return false;
    }
    if (!form.destination.trim()) {
      setError("Veuillez saisir la destination");
      return false;
    }
    if (!form.driver.name.trim()) {
      setError("Veuillez saisir le nom du chauffeur");
      return false;
    }
    if (!form.driver.phone.trim()) {
      setError("Veuillez saisir le numéro de téléphone du chauffeur");
      return false;
    }
    if (!form.vehicle.plateNumber.trim()) {
      setError("Veuillez saisir le numéro de plaque du véhicule");
      return false;
    }
    if (!form.cargo.productId) {
      setError("Veuillez sélectionner un produit");
      return false;
    }
    if (form.cargo.boxesCount < 1) {
      setError("Le nombre de cartons doit être au moins 1");
      return false;
    }
    if (form.cargo.piecesPerBox < 1) {
      setError("Le nombre de pièces par carton doit être au moins 1");
      return false;
    }
    if (!form.departureTime) {
      setError("Veuillez saisir la date et heure de départ");
      return false;
    }
    if (!form.expectedArrivalTime) {
      setError("Veuillez saisir la date et heure d'arrivée prévue");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    setError(null);
    setMessage(null);
    
    try {
      await apiFetch("/cars", {
        method: "POST",
        body: JSON.stringify(form),
      });
      
      setMessage("✅ Trajet enregistré avec succès !");
        
      // Reset form
      setForm({
        origin: "",
        destination: "",
        driver: {
          name: "",
          phone: "",
          licenseNumber: "",
        },
        vehicle: {
          plateNumber: "",
          model: "",
          capacity: 0,
        },
        cargo: {
          productId: "",
          boxesCount: 1,
          piecesPerBox: 1,
          weight: 0,
          value: 0,
        },
        departureTime: "",
        expectedArrivalTime: "",
        fuelCost: 0,
        tollCost: 0,
        otherCosts: 0,
        notes: "",
      });
        
      // Trigger refresh in CarsHistory
      window.dispatchEvent(new Event("tripCreated"));
        
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error("Error creating trip:", error);
      setError(getErrorMessage(error, "Erreur de connexion. Veuillez réessayer."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Nouveau Trajet</h1>
          </div>
          <p className="text-blue-200/70">
            Enregistrer un nouveau trajet de camion avec les détails du chargement
          </p>
        </div>
        
        {/* Messages */}
        {message && (
          <div className="p-4 bg-green-900/50 border border-green-700/50 text-green-300 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {message}
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700/50 text-red-300 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Origin & Destination */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl p-6 border border-blue-800/50">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <MapPin className="w-5 h-5" />
              Itinéraire
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Lieu de départ *
                </label>
                <input
                  type="text"
                  name="origin"
                  value={form.origin}
                  onChange={handleChange}
                  placeholder="Ex: Lubumbashi"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Destination *
                </label>
                <input
                  type="text"
                  name="destination"
                  value={form.destination}
                  onChange={handleChange}
                  placeholder="Ex: Kinshasa"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                />
              </div>
            </div>
          </div>
          
          {/* Section 2: Driver Information */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl p-6 border border-blue-800/50">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <User className="w-5 h-5" />
              Informations du Chauffeur
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Nom complet *
                </label>
                <input
                  type="text"
                  name="driver.name"
                  value={form.driver.name}
                  onChange={handleChange}
                  placeholder="Nom du chauffeur"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  name="driver.phone"
                  value={form.driver.phone}
                  onChange={handleChange}
                  placeholder="+243 XXX XXX XXX"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Permis de conduire
                </label>
                <input
                  type="text"
                  name="driver.licenseNumber"
                  value={form.driver.licenseNumber}
                  onChange={handleChange}
                  placeholder="Numéro de permis"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                />
              </div>
            </div>
          </div>
          
          {/* Section 3: Vehicle Information */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl p-6 border border-blue-800/50">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <Truck className="w-5 h-5" />
              Informations du Véhicule
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Numéro de plaque *
                </label>
                <input
                  type="text"
                  name="vehicle.plateNumber"
                  value={form.vehicle.plateNumber}
                  onChange={handleChange}
                  placeholder="Ex: LU 1234 A"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50 uppercase"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Modèle
                </label>
                <input
                  type="text"
                  name="vehicle.model"
                  value={form.vehicle.model}
                  onChange={handleChange}
                  placeholder="Ex: Mercedes Actros"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Capacité (tonnes)
                </label>
                <input
                  type="number"
                  name="vehicle.capacity"
                  value={form.vehicle.capacity || ""}
                  onChange={handleNumberChange}
                  placeholder="0"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          </div>
          
          {/* Section 4: Cargo Details */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl p-6 border border-blue-800/50">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <Package className="w-5 h-5" />
              Détails du Chargement
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Produit *
                </label>
                <select
                  name="cargo.productId"
                  value={form.cargo.productId}
                  onChange={handleChange}
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Nombre de cartons *
                </label>
                <input
                  type="number"
                  name="cargo.boxesCount"
                  value={form.cargo.boxesCount}
                  onChange={handleNumberChange}
                  min="1"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Pièces par carton *
                </label>
                <input
                  type="number"
                  name="cargo.piecesPerBox"
                  value={form.cargo.piecesPerBox}
                  onChange={handleNumberChange}
                  min="1"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Poids total (kg)
                </label>
                <input
                  type="number"
                  name="cargo.weight"
                  value={form.cargo.weight || ""}
                  onChange={handleNumberChange}
                  min="0"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Valeur estimée (USD)
                </label>
                <input
                  type="number"
                  name="cargo.value"
                  value={form.cargo.value || ""}
                  onChange={handleNumberChange}
                  min="0"
                  step="0.01"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
            </div>
            
            {/* Summary Card */}
            <div className="bg-blue-950/30 rounded-lg p-4 border border-blue-800/30">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">Résumé du chargement</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-300">Cartons:</span>
                  <p className="text-white font-semibold">{form.cargo.boxesCount}</p>
                </div>
                <div>
                  <span className="text-blue-300">Pièces/carton:</span>
                  <p className="text-white font-semibold">{form.cargo.piecesPerBox}</p>
                </div>
                <div>
                  <span className="text-blue-300">Total pièces:</span>
                  <p className="text-white font-semibold">{totalPieces.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-blue-300">Valeur totale:</span>
                  <p className="text-white font-semibold">${form.cargo.value.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Section 5: Schedule */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl p-6 border border-blue-800/50">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <Calendar className="w-5 h-5" />
              Calendrier du Trajet
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Date et heure de départ *
                </label>
                <input
                  type="datetime-local"
                  name="departureTime"
                  value={form.departureTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Date et heure d'arrivée prévue *
                </label>
                <input
                  type="datetime-local"
                  name="expectedArrivalTime"
                  value={form.expectedArrivalTime}
                  onChange={handleChange}
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
            </div>
          </div>
          
          {/* Section 6: Costs */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl p-6 border border-blue-800/50">
            <h2 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
              <DollarSign className="w-5 h-5" />
              Coûts du Trajet
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Carburant (USD)
                </label>
                <input
                  type="number"
                  name="fuelCost"
                  value={form.fuelCost || ""}
                  onChange={handleNumberChange}
                  min="0"
                  step="0.01"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Péage (USD)
                </label>
                <input
                  type="number"
                  name="tollCost"
                  value={form.tollCost || ""}
                  onChange={handleNumberChange}
                  min="0"
                  step="0.01"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-blue-200">
                  Autres frais (USD)
                </label>
                <input
                  type="number"
                  name="otherCosts"
                  value={form.otherCosts || ""}
                  onChange={handleNumberChange}
                  min="0"
                  step="0.01"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>
            </div>
            
            {/* Total Cost */}
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-4 text-center">
              <p className="text-blue-300 text-sm mb-1">Coût total du trajet</p>
              <p className="text-2xl font-bold text-white">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          
          {/* Section 7: Notes */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl p-6 border border-blue-800/50">
            <label className="block mb-2 font-medium text-blue-200">
              Notes supplémentaires
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Informations supplémentaires sur le trajet..."
              className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
            />
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-xl font-medium text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/50 border border-blue-400/30 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Enregistrement en cours...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Enregistrer le trajet
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function updateNestedFormValue(
  form: CarTrip,
  parent: string,
  child: string,
  value: string | number
): CarTrip {
  switch (parent) {
    case "driver":
      return {
        ...form,
        driver: {
          ...form.driver,
          [child]: String(value),
        },
      };
    case "vehicle":
      return {
        ...form,
        vehicle: {
          ...form.vehicle,
          [child]: child === "capacity" ? Number(value) : String(value),
        },
      };
    case "cargo":
      return {
        ...form,
        cargo: {
          ...form.cargo,
          [child]: child === "productId" ? String(value) : Number(value),
        },
      };
    default:
      return form;
  }
}
