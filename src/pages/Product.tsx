"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  X,
  AlertCircle,
  CheckCircle,
  Scale,
  Tag,
  Box,
  Layers
} from "lucide-react";
import { getProductStatus } from "../utils/constants";
import { toast } from "react-toastify";
import type { Product } from "../types";
import { serverUrl } from "../utils/constants";
import CategoriesDropdown from "../components/CategoriesDropdown";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
}

interface FormData {
  name: string;
  description: string;
  category: string;
  brand: string;
  stock: number;
  cartonStock: number;
  loosePieces: number;
  piecesPerCarton: number;
  minStock: number;
  minStockCartons: number;
  minStockPieces: number;
  unit: string;
  weight: number;
  status: "active" | "inactive";
}

function getPiecesPerCarton(product: Pick<Product, "piecesPerCarton">) {
  return Math.max(1, Math.floor(Number(product.piecesPerCarton || 1)));
}

function splitStock(totalPieces: number, piecesPerCarton: number) {
  const safePiecesPerCarton = Math.max(1, Math.floor(Number(piecesPerCarton || 1)));
  const safeTotal = Math.max(0, Math.floor(Number(totalPieces || 0)));
  return {
    cartons: Math.floor(safeTotal / safePiecesPerCarton),
    pieces: safeTotal % safePiecesPerCarton,
  };
}

function formatCartonStock(totalPieces: number, piecesPerCarton: number) {
  if (piecesPerCarton <= 1) {
    const safeTotal = Math.max(0, Math.floor(Number(totalPieces || 0)));
    return `${safeTotal} pièce${safeTotal > 1 ? "s" : ""}`;
  }
  const { cartons, pieces } = splitStock(totalPieces, piecesPerCarton);
  const cartonLabel = cartons > 1 ? "cartons" : "carton";
  if (pieces === 0) return `${cartons} ${cartonLabel}`;
  return `${cartons} ${cartonLabel} et ${pieces} pièce${pieces > 1 ? "s" : ""}`;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    category: "",
    brand: "",
    stock: 0,
    cartonStock: 0,
    loosePieces: 0,
    piecesPerCarton: 1,
    minStock: 0,
    minStockCartons: 0,
    minStockPieces: 0,
    unit: "pièce",
    weight: 0,
    status: "active",
  });

  // Get current user from localStorage
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const isAdmin = currentUser?.role === "admin";

  // API Functions
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${serverUrl}/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        console.error("Failed to fetch products:", await response.text());
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (productData: FormData) => {
    try {
      const response = await fetch(`${serverUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(productData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProducts((prev: Product[]) => [...prev, data]);
        setShowAddModal(false);
        resetForm();
        toast.success("Article ajouté avec succès!");
      } else {
        toast.error(data.error || "Échec de l'ajout de l'Article");
      }
    } catch (error) {
      console.error("Erreur d'ajout de l'Article:", error);
      toast.error("Erreur lors de la création du produit");
    }
  };

  const updateProduct = async (id: string, productData: FormData) => {
    try {
      const response = await fetch(`${serverUrl}/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(productData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProducts((prev: Product[]) =>
          prev.map((p: Product) => (p._id === id ? data : p))
        );
        setShowEditModal(false);
        resetForm();
        toast.success("Article mis à jour avec succès!");
      } else {
        toast.error(data.error || "Échec de la mise à jour de l'Article");
      }
    } catch (error) {
      console.error("Erreur de mise à jour de l'Article:", error);
      toast.error("Erreur lors de la mise à jour du produit");
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet article?")) return;
    try {
      const response = await fetch(`${serverUrl}/products/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      if (response.ok) {
        setProducts((prev: Product[]) => prev.filter((p: Product) => p._id !== id));
        toast.success("Article supprimé");
      } else {
        toast.error("Échec de la suppression de l'Article");
      }
    } catch (error) {
      console.error("Erreur de suppression de l'Article:", error);
      toast.error("Erreur lors de la suppression du produit");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      brand: "",
      stock: 0,
      cartonStock: 0,
      loosePieces: 0,
      piecesPerCarton: 1,
      minStock: 0,
      minStockCartons: 0,
      minStockPieces: 0,
      unit: "pièce",
      weight: 0,
      status: "active",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for box-based product
    if (formData.loosePieces >= formData.piecesPerCarton) {
      toast.error("Les pièces restantes doivent être inférieures aux pièces par carton");
      return;
    }
    if (formData.minStockPieces >= formData.piecesPerCarton) {
      toast.error("Les pièces du stock minimum doivent être inférieures aux pièces par carton");
      return;
    }

    const productData = {
      ...formData,
      stock: formData.cartonStock * formData.piecesPerCarton + formData.loosePieces,
      minStock:
        formData.minStockCartons * formData.piecesPerCarton +
        formData.minStockPieces,
      unit: "pièce",
    };

    if (showEditModal && selectedProduct) {
      updateProduct(selectedProduct._id, productData);
    } else {
      createProduct(productData);
    }
  };

  const openEditModal = (product: Product) => {
    const piecesPerCarton = getPiecesPerCarton(product);
    const stockParts = splitStock(product.stock || 0, piecesPerCarton);
    const minStockParts = splitStock(product.minStock || 0, piecesPerCarton);

    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      category: product.category,
      brand: product.brand || "",
      stock: product.stock || 0,
      cartonStock: stockParts.cartons,
      loosePieces: stockParts.pieces,
      piecesPerCarton,
      minStock: product.minStock || 0,
      minStockCartons: minStockParts.cartons,
      minStockPieces: minStockParts.pieces,
      unit: product.unit || "pièce",
      weight: product.weight || 0,
      status: product.status || "active",
    });
    setShowEditModal(true);
  };

  const openViewModal = (product: Product) => {
    setSelectedProduct(product);
    setShowViewModal(true);
  };

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Function to display stock information based on user role
  const renderStockInfo = (product: Product) => {
    const piecesPerCarton = getPiecesPerCarton(product);
    if (isAdmin) {
      // Admin sees exact stock numbers
      return (
        <span
          className={`text-sm font-medium ${
            product.stock <= product.minStock
              ? "text-red-400"
              : "text-blue-400"
          }`}
        >
          {formatCartonStock(product.stock, piecesPerCarton)}
        </span>
      );
    } else {
      // Staff sees stock status instead of exact numbers
      if (product.stock === 0) {
        return (
          <span className="text-sm text-red-400 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            En rupture
          </span>
        );
      } else if (product.stock <= product.minStock) {
        return (
          <span className="text-sm text-orange-400 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Stock faible
          </span>
        );
      } else {
        return (
          <span className="text-sm text-green-400 font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            En stock
          </span>
        );
      }
    }
  };

  // Function to display stock details in view modal based on user role
  const renderStockDetails = (product: Product) => {
    const piecesPerCarton = getPiecesPerCarton(product);
    if (isAdmin) {
      // Admin sees all stock details
      return (
        <>
          <div className="flex justify-between py-2 border-b border-blue-900/20">
            <span className="text-gray-400">Stock Actuel:</span>
            <span
              className={`font-medium ${
                product.stock <= product.minStock
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {formatCartonStock(product.stock, piecesPerCarton)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-blue-900/20">
            <span className="text-gray-400">Pièces par carton:</span>
            <span className="font-medium text-blue-400">
              {piecesPerCarton} pièce{piecesPerCarton > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-blue-900/20">
            <span className="text-gray-400">Stock minimal:</span>
            <span className="font-medium text-blue-400">
              {formatCartonStock(product.minStock, piecesPerCarton)}
            </span>
          </div>
        </>
      );
    } else {
      // Staff sees only stock status
      return (
        <div className="flex justify-between py-2 border-b border-blue-900/20">
          <span className="text-gray-400">Statut du stock:</span>
          {product.stock === 0 ? (
            <span className="font-medium text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              En rupture
            </span>
          ) : product.stock <= product.minStock ? (
            <span className="font-medium text-orange-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Stock faible
            </span>
          ) : (
            <span className="font-medium text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              En stock
            </span>
          )}
        </div>
      );
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-black via-blue-950 to-black min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-400" />
            Articles
          </h1>
          <p className="text-blue-200/70">Gérez votre catalogue des Articles</p>
          {!isAdmin && (
            <p className="text-sm text-blue-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
              Staff - Vue limitée
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg shadow-blue-900/50 border border-blue-400/30"
          >
            <Plus className="w-4 h-4" />
            Ajouter un nouvel Article
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-gradient-to-br from-gray-900 to-blue-950 p-4 rounded-lg shadow-xl border border-blue-800/50">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
              <input
                type="text"
                placeholder="Recherchez des Articles par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white placeholder-blue-300/50"
              />
            </div>
          </div>
          <div className="sm:w-64">
            <CategoriesDropdown
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-lg shadow-xl border border-blue-800/50">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
            <p className="mt-2 text-blue-200/70">Chargement des Articles......</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-blue-400/50" />
            <p className="text-blue-200/70">Aucun article trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/50 border-b border-blue-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-800/30">
                {filteredProducts.map((product: Product, idx: number) => (
                  <tr key={product._id || idx} className="hover:bg-blue-900/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-300/70">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {product.name}
                          </div>
                          <div className="text-sm text-blue-300/70">
                            {product.brand || "Sans marque"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-300">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStockInfo(product)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.status === "active"
                            ? "bg-green-900/50 text-green-400 border border-green-500/30"
                            : "bg-red-900/50 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {getProductStatus(product.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(product)}
                          className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(product)}
                              className="text-green-400 hover:text-green-300 p-1 rounded transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteProduct(product._id)}
                              className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

      {/* Add/Edit Product Modal - Only for Admin */}
      {(showAddModal || showEditModal) && isAdmin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-blue-800/50 shadow-2xl">
            <div className="p-6 border-b border-blue-800/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  {showEditModal ? (
                    <>
                      <Edit className="w-5 h-5 text-blue-400" />
                      Modifier l'Article
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-blue-400" />
                      Ajouter un Article
                    </>
                  )}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-2">
                    <Tag className="w-4 h-4" />
                    Information Basique
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Nom de l'Article *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white placeholder-blue-300/50"
                      placeholder="Ex: Widget Pro X200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white placeholder-blue-300/50"
                      placeholder="Description du produit..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Catégorie *
                    </label>
                    <CategoriesDropdown
                      selectedCategory={formData.category}
                      setSelectedCategory={(categoryName: string) =>
                        setFormData((prev) => ({
                          ...prev,
                          category: categoryName,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Marque
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev) => ({
                          ...prev,
                          brand: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white placeholder-blue-300/50"
                      placeholder="Ex: Apple, Samsung, Nike"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Statut
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setFormData((prev) => ({
                          ...prev,
                          status: e.target.value as "active" | "inactive",
                        }))
                      }
                      className="w-full px-3 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white"
                    >
                      <option value="active" className="bg-gray-900">Actif</option>
                      <option value="inactive" className="bg-gray-900">Inactif</option>
                    </select>
                  </div>
                </div>

                {/* Box Management - Simplified */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-2">
                    <Box className="w-4 h-4" />
                    Gestion par Boîtes
                  </h3>

                  {/* Number of Boxes */}
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Nombre de boîtes *
                    </label>
                    <div className="relative">
                      <Package className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.cartonStock}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev) => ({
                            ...prev,
                            cartonStock: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-full pl-10 pr-4 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white"
                        placeholder="Ex: 5"
                      />
                    </div>
                    <p className="mt-1 text-xs text-blue-300/70">
                      Nombre total de boîtes en stock
                    </p>
                  </div>

                  {/* Pieces Per Box */}
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Pièces par boîte *
                    </label>
                    <div className="relative">
                      <Layers className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                      <input
                        type="number"
                        min="1"
                        required
                        value={formData.piecesPerCarton}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const piecesPerCarton = Math.max(1, parseInt(e.target.value) || 1);
                          setFormData((prev) => ({
                            ...prev,
                            piecesPerCarton,
                            loosePieces: Math.min(prev.loosePieces, piecesPerCarton - 1),
                            minStockPieces: Math.min(prev.minStockPieces, piecesPerCarton - 1),
                          }));
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white"
                        placeholder="Ex: 12"
                      />
                    </div>
                    <p className="mt-1 text-xs text-blue-300/70">
                      Exemple: Si chaque boîte contient 12 pièces, entrez 12
                    </p>
                  </div>

                  {/* Stock Summary */}
                  <div className="rounded-lg border border-blue-800/30 bg-black/30 p-3 text-sm text-blue-200">
                    <div className="flex justify-between items-center">
                      <span>Stock total:</span>
                      <strong className="text-white text-lg">
                        {formatCartonStock(
                          formData.cartonStock * formData.piecesPerCarton + formData.loosePieces,
                          formData.piecesPerCarton
                        )}
                      </strong>
                    </div>
                    <div className="text-xs text-blue-300/70 mt-1">
                      ({formData.cartonStock} boîte{formData.cartonStock > 1 ? "s" : ""} × {formData.piecesPerCarton} pièces/boîte)
                    </div>
                  </div>

                  {/* Minimum Stock Alert */}
                  <div className="border-t border-blue-800/50 pt-4 mt-2">
                    <h4 className="text-sm font-medium text-blue-300 mb-3">
                      Seuil d'alerte (Stock minimum)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-300 mb-1">
                          Boîtes minimum
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.minStockCartons}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev) => ({
                              ...prev,
                              minStockCartons: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-300 mb-1">
                          Pièces supplémentaires
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={Math.max(0, formData.piecesPerCarton - 1)}
                          value={formData.minStockPieces}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData((prev) => ({
                              ...prev,
                              minStockPieces: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-300/70">
                      Alerte quand stock {'<'} {formatCartonStock(
                        formData.minStockCartons * formData.piecesPerCarton + formData.minStockPieces,
                        formData.piecesPerCarton
                      )}
                    </div>
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-medium text-blue-300 mb-1">
                      Poids (kg)
                    </label>
                    <div className="relative">
                      <Scale className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.weight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev) => ({
                            ...prev,
                            weight: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full pl-10 pr-4 py-2 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Hidden fields for compatibility */}
                  <input type="hidden" value={formData.loosePieces} />
                  <input type="hidden" value={formData.unit} />
                  <input type="hidden" value={formData.stock} />
                  <input type="hidden" value={formData.minStock} />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-blue-800/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-blue-300 bg-black/50 hover:bg-black/70 rounded-lg transition-colors border border-blue-800/50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-lg transition-all duration-200 shadow-lg shadow-blue-900/50 border border-blue-400/30"
                >
                  {showEditModal ? "Mettre à jour" : "Ajouter l'Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {showViewModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-blue-950 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-blue-800/50 shadow-2xl">
            <div className="p-6 border-b border-blue-800/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  Détails de l'Article
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-blue-300/70 mt-1">{selectedProduct.brand || "Sans marque"}</p>
                  <p className="text-gray-300 mt-2">
                    {selectedProduct.description || "Aucune description"}
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedProduct.status === "active"
                          ? "bg-green-900/50 text-green-400 border border-green-500/30"
                          : "bg-red-900/50 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {getProductStatus(selectedProduct.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-400 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Informations
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-blue-900/20">
                      <span className="text-gray-400">Catégorie:</span>
                      <span className="font-medium text-blue-300">
                        {selectedProduct.category}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-blue-900/20">
                      <span className="text-gray-400">Unité:</span>
                      <span className="font-medium text-blue-300">
                        {selectedProduct.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-400 flex items-center gap-2">
                    <Box className="w-4 h-4" />
                    Stock
                  </h4>
                  <div className="space-y-2 text-sm">
                    {renderStockDetails(selectedProduct)}
                  </div>
                </div>
              </div>

              {selectedProduct.weight && selectedProduct.weight > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-400 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Propriétés physiques
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between py-2 border-b border-blue-900/20">
                      <span className="text-gray-400">Poids:</span>
                      <span className="font-medium text-blue-300">
                        {selectedProduct.weight} kg
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="flex justify-end gap-4 pt-6 border-t border-blue-800/50">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      openEditModal(selectedProduct);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-900/50 border border-blue-400/30"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier l'Article
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
