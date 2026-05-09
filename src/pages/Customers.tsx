"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Eye,
  Trash2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  UserPlus,
  User,
} from "lucide-react";

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  totalPurchases: number;
  totalSpent: number;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  createdAt: string;
  updatedAt: string;
}

const serverUrl = import.meta.env.VITE_API_URL;

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [recalculating, setRecalculating] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      // Remove pagination - fetch ALL customers at once
      const response = await fetch(
        `${serverUrl}/customers?limit=0&timestamp=${Date.now()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let allCustomers: Customer[] = [];
      if (Array.isArray(data)) {
        allCustomers = data;
      } else if (data.customers && Array.isArray(data.customers)) {
        allCustomers = data.customers;
      } else if (data.data && Array.isArray(data.data)) {
        allCustomers = data.data;
      } else {
        console.warn("Unexpected customers data structure:", data);
        allCustomers = [];
      }

      console.log(`Fetched ${allCustomers.length} customers from API`);
      setCustomers(allCustomers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      // Try alternative endpoints
      await tryAlternativeFetch();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Alternative fetch method if the main one fails
  const tryAlternativeFetch = async () => {
    try {
      console.log("Customers: Trying alternative fetch method...");
      
      const endpoints = [
        `${serverUrl}/customers?limit=1000`,
        `${serverUrl}/customers/all`,
      ];
      
      let allCustomers: Customer[] = [];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              allCustomers = data;
              break;
            } else if (data.customers && Array.isArray(data.customers)) {
              allCustomers = data.customers;
              break;
            } else if (data.data && Array.isArray(data.data)) {
              allCustomers = data.data;
              break;
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch from ${endpoint}:`, error);
          continue;
        }
      }
      
      console.log(`Customers: Alternative fetch got ${allCustomers.length} customers`);
      setCustomers(allCustomers);
    } catch (error) {
      console.error("Customers: Alternative fetch also failed:", error);
    }
  };

  const refreshCustomers = async () => {
    setRefreshing(true);
    await fetchCustomers();
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const calculateTotalRevenue = () => {
    return customers.reduce((sum, customer) => sum + customer.totalSpent, 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === "null" || dateString === "undefined") return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString || dateString === "null" || dateString === "undefined") return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${serverUrl}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({ name: "", phone: "", email: "" });
        await fetchCustomers();
      } else {
        console.error("Failed to add customer:", response.status);
      }
    } catch (error) {
      console.error("Error adding customer:", error);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce client?")) {
      try {
        const response = await fetch(`${serverUrl}/customers/${customerId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });

        if (response.ok) {
          await fetchCustomers();
        } else {
          console.error("Failed to delete customer:", response.status);
        }
      } catch (error) {
        console.error("Error deleting customer:", error);
      }
    }
  };

  const recalculateCustomerStats = async (customerId: string) => {
    try {
      setRecalculating(customerId);

      const response = await fetch(
        `${serverUrl}/customers/${customerId}/recalculate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        }
      );

      if (response.ok) {
        await fetchCustomers();
        alert("Statistiques recalculées avec succès!");
      } else if (response.status === 404) {
        alert(
          "Fonction de recalcul non disponible. Pour corriger les statistiques:\n\n" +
            "1. Allez dans l'historique des ventes\n" +
            "2. Modifiez puis sauvegardez une vente de ce client\n" +
            "3. Les statistiques seront automatiquement recalculées"
        );
      }
    } catch (error) {
      console.error("Error recalculating customer stats:", error);
      alert("Erreur lors du recalcul. Vérifiez la console pour plus de détails.");
    } finally {
      setRecalculating(null);
    }
  };

  const viewCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">Gérez vos relations clients</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refreshCustomers}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Actualisation..." : "Actualiser"}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <UserPlus className="w-4 h-4" />
              Ajouter un Client
            </button>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="rechercher les clients..."
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Nombre Total de Clients</p>
                <p className="text-xl font-semibold text-gray-900">{customers.length}</p>
              </div>
            </div>
            <div className="mt-2 h-1 w-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Revenue Totale Clients</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(calculateTotalRevenue())}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {customers.filter((c) => c.totalSpent > 0).length} clients actifs
                </p>
              </div>
            </div>
            <div className="mt-2 h-1 w-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
          </div>
        </div>

        {/* Warning Banner */}
        {customers.some(
          (customer) =>
            customer.totalPurchases > 0 &&
            (customer.totalSpent === 0 || customer.totalSpent > 100000)
        ) && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Attention: Statistiques potentiellement inexactes
                </p>
                <p className="text-sm text-yellow-700">
                  Certaines statistiques clients peuvent être incorrectes suite à
                  des modifications de ventes. Utilisez "Recalculer les
                  statistiques" pour corriger.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Répertoire clients ({filteredCustomers.length})
            </h2>
            <button
              onClick={refreshCustomers}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Chargement des clients...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50 text-blue-400" />
                <p>Aucun client trouvé</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre d'achats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant total dépensé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernier Achat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                              <span className="text-sm font-medium text-white">
                                {customer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Client depuis {formatDate(customer.createdAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-blue-500" />
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3 text-blue-400" />
                            {customer.email}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <ShoppingBag className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-900 font-medium">
                            {customer.totalPurchases}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(customer.totalSpent)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-400" />
                          {formatDate(customer.lastPurchaseDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewCustomerDetails(customer)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                            title="Voir les détails du client"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => recalculateCustomerStats(customer._id)}
                            disabled={recalculating === customer._id}
                            className="text-green-600 hover:text-green-900 p-1 rounded disabled:opacity-50 transition-colors"
                            title="Recalculer les statistiques"
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${
                                recalculating === customer._id ? "animate-spin" : ""
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                            title="supprimer le client"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* REMOVED PAGINATION SECTION - No more page navigation */}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl border border-blue-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Ajouter un Nouveau Client
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input
                  type="tel"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Ajouter le Client
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-blue-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Détails du client
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                  <span className="text-xl font-medium text-white">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedCustomer.name}</h4>
                  <p className="text-gray-600 flex items-center gap-1 mt-1">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Client depuis {formatDate(selectedCustomer.createdAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                    <Phone className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-900">{selectedCustomer.phone}</span>
                  </div>
                </div>
                {selectedCustomer.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-900">{selectedCustomer.email}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-full">
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600">Nombre total d'achats</p>
                      <p className="text-xl font-semibold text-blue-900">{selectedCustomer.totalPurchases}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 rounded-full">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Somme dépensée</p>
                      <p className="text-xl font-semibold text-green-900">
                        {formatCurrency(selectedCustomer.totalSpent)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 rounded-full">
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-600">Premier Achat</p>
                      <p className="text-sm font-semibold text-purple-900">
                        {formatDateTime(selectedCustomer.firstPurchaseDate)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 rounded-full">
                      <Calendar className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-orange-600">Dernier Achat</p>
                      <p className="text-sm font-semibold text-orange-900">
                        {formatDateTime(selectedCustomer.lastPurchaseDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => recalculateCustomerStats(selectedCustomer._id)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recalculer les Statistiques
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}