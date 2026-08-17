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
  Layers,
  ClipboardList,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  CreditCard,
  Download,
  History,
} from "lucide-react";
import jsPDF from "jspdf";
import { getProductStatus, getCustomerDisplayName } from "../utils/constants";
import { toast } from "react-toastify";
import type { Product } from "../types";
import { serverUrl } from "../utils/constants";
import CategoriesDropdown from "../components/CategoriesDropdown";

interface User {
  _id: string;
  username: string;
  email: string;
  role: "admin" | "superadmin" | "manager" | "staff" | "cashier_supervisor" | "inventory_manager";
}

interface SaleItem {
  productId?: string;
  name: string;
  quantity: number;
  bonusQuantity?: number;
  paidQuantity?: number;
  cartonQuantity?: number;
  looseQuantity?: number;
  bonusCartons?: number;
  bonusPieces?: number;
  price: number;
  total?: number;
  piecesPerCarton?: number;
}

interface FicheSale {
  _id: string;
  saleId?: string;
  createdAt: string;
  customer?: { name?: string; phone?: string };
  items: SaleItem[];
  total: number;
  paymentType?: "cash" | "credit";
  paymentMethod?: string;
  creditDetails?: {
    amountPaid: number;
    amountDue: number;
    fullyPaid: boolean;
    dueDate?: string;
  };
  recordedBy?: string;
}

type FicheRange = "today" | "week" | "month" | "custom";

interface LedgerAction {
  id: string;
  date: string;
  type: string;
  label: string;
  source: string;
  reference: string;
  previousStock: number;
  change: number; // signed — positive increases stock, negative decreases it
  newStock: number;
  performedBy: string;
  performedByRole?: string;
  branchId: "butembo" | "beni";
  reason: string;
}

interface StockLedger {
  branch: { id: "butembo" | "beni"; name: string };
  product: {
    _id: string;
    name: string;
    status: "active" | "inactive";
    category: string;
    piecesPerCarton: number;
    currentStock: number;
  };
  period: { range: string; start: string; end: string };
  summary: {
    startingStock: number;
    added: number;
    removed: number;
    endingStock: number;
    currentStock: number;
    actionsCount: number;
  };
  actions: LedgerAction[];
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

function getPaidQuantity(item: SaleItem) {
  const bonus = Math.max(0, Number(item.bonusQuantity || 0));
  return Math.max(0, Number(item.paidQuantity ?? Number(item.quantity || 0) - bonus));
}

function getSoldCartons(item: SaleItem, piecesPerCarton: number) {
  const paid = getPaidQuantity(item);
  const recordedParts = Number(item.cartonQuantity || 0) + Number(item.looseQuantity || 0);
  return recordedParts > 0
    ? Math.max(0, Number(item.cartonQuantity || 0))
    : Math.floor(paid / getPiecesPerCarton({ piecesPerCarton }));
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

  // Fiche de Stocks state
  const [showFicheModal, setShowFicheModal] = useState(false);
  const [ficheProduct, setFicheProduct] = useState<Product | null>(null);
  const [ficheSales, setFicheSales] = useState<FicheSale[]>([]);
  const [ficheLedger, setFicheLedger] = useState<StockLedger | null>(null);
  const [ficheLedgerLoading, setFicheLedgerLoading] = useState(false);
  const [ficheRange, setFicheRange] = useState<FicheRange>("month");
  const [ficheCustomFrom, setFicheCustomFrom] = useState("");
  const [ficheCustomTo, setFicheCustomTo] = useState("");
  const [ficheLoading, setFicheLoading] = useState(false);
  const [ficheTab, setFicheTab] = useState<"summary" | "bonus" | "credit">("summary");

  // Manual stock adjustment reason — captured on edit, sent to the backend so the
  // Fiche de Stock audit trail can show why the stock number changed.
  const [editReason, setEditReason] = useState("");

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

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";

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

  const updateProduct = async (id: string, productData: FormData & { reason?: string }) => {
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

  // Products are never hard-deleted — this deactivates the product (its stock,
  // history, and ID all stay intact); it can be reactivated afterwards.
  const deactivateProduct = async (id: string) => {
    if (!confirm("Désactiver cet article ? Il restera dans l'historique et pourra être réactivé plus tard.")) return;
    try {
      const response = await fetch(`${serverUrl}/products/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setProducts((prev: Product[]) =>
          prev.map((p: Product) => (p._id === id ? data.product : p))
        );
        toast.success("Article désactivé");
      } else {
        toast.error(data.error || "Échec de la désactivation de l'Article");
      }
    } catch (error) {
      console.error("Erreur de désactivation de l'Article:", error);
      toast.error("Erreur lors de la désactivation du produit");
    }
  };

  const reactivateProduct = async (id: string) => {
    try {
      const response = await fetch(`${serverUrl}/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify({ status: "active" }),
      });
      const data = await response.json();
      if (response.ok) {
        setProducts((prev: Product[]) => prev.map((p: Product) => (p._id === id ? data : p)));
        toast.success("Article réactivé");
      } else {
        toast.error(data.error || "Échec de la réactivation de l'Article");
      }
    } catch (error) {
      console.error("Erreur de réactivation de l'Article:", error);
      toast.error("Erreur lors de la réactivation du produit");
    }
  };

  const fetchFicheSales = async (product: Product) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(
        `${serverUrl}/sales?from=1970-01-01&to=${today}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
      );
      if (res.ok) {
        const json = await res.json();
        const allSales: FicheSale[] = Array.isArray(json?.data) ? json.data : [];
        const related = allSales.filter((sale) =>
          (sale.items || []).some(
            (item) => item.productId === product._id || item.name === product.name
          )
        );
        setFicheSales(related.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        toast.error("Impossible de charger l'historique des ventes");
      }
    } catch {
      toast.error("Erreur réseau lors du chargement");
    }
  };

  const fetchFicheLedger = async (
    product: Product,
    range: FicheRange,
    from?: string,
    to?: string
  ) => {
    if (range === "custom" && (!from || !to)) {
      toast.error("Veuillez sélectionner une période personnalisée valide");
      return;
    }
    try {
      setFicheLedgerLoading(true);
      const params = new URLSearchParams({ range });
      if (range === "custom" && from && to) {
        params.set("from", from);
        params.set("to", to);
      }
      const res = await fetch(
        `${serverUrl}/stock-movements/ledger/${product._id}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }
      );
      if (res.ok) {
        const json = await res.json();
        setFicheLedger(json);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Impossible de charger la fiche de stock");
        setFicheLedger(null);
      }
    } catch {
      toast.error("Erreur réseau lors du chargement de la fiche de stock");
      setFicheLedger(null);
    } finally {
      setFicheLedgerLoading(false);
    }
  };

  const applyFicheRange = async (product: Product, range: "today" | "week" | "month") => {
    setFicheRange(range);
    await fetchFicheLedger(product, range);
  };

  const applyFicheCustomRange = async (product: Product) => {
    if (!ficheCustomFrom || !ficheCustomTo) {
      toast.error("Veuillez sélectionner une date de début et une date de fin");
      return;
    }
    if (ficheCustomFrom > ficheCustomTo) {
      toast.error("La date de début doit précéder la date de fin");
      return;
    }
    setFicheRange("custom");
    await fetchFicheLedger(product, "custom", ficheCustomFrom, ficheCustomTo);
  };

  const loadFicheData = async (product: Product, range: FicheRange = ficheRange) => {
    setFicheLoading(true);
    try {
      await Promise.all([fetchFicheSales(product), fetchFicheLedger(product, range)]);
    } finally {
      setFicheLoading(false);
    }
  };

  const openFicheModal = async (product: Product) => {
    setFicheProduct(product);
    setFicheTab("summary");
    setFicheRange("month");
    setFicheCustomFrom("");
    setFicheCustomTo("");
    setShowFicheModal(true);
    setFicheSales([]);
    setFicheLedger(null);
    await loadFicheData(product, "month");
  };

  const closeFicheModal = () => {
    setShowFicheModal(false);
    setFicheProduct(null);
    setFicheSales([]);
    setFicheLedger(null);
    setFicheTab("summary");
  };

  const COMPANY_NAME = "Entre Nous Renove";
  const activeBranchName = localStorage.getItem("activeBranchId") === "beni" ? "Beni" : "Butembo";

  const FICHE_RANGE_LABELS: Record<FicheRange, string> = {
    today: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    custom: "Période personnalisée",
  };

  const buildFichePDF = (
    doc: jsPDF,
    product: Product,
    sales: FicheSale[],
    startY: number
  ): number => {
    const ppc = getPiecesPerCarton(product);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const left = 14;
    let y = startY;

    const checkPage = (needed = 10) => {
      if (y + needed > pageH - 18) { doc.addPage(); y = 20; }
    };

    const productItems = sales.flatMap((sale) =>
      (sale.items || [])
        .filter((item) => item.productId === product._id || item.name === product.name)
        .map((item) => ({ ...item, sale }))
    );
    const totalSoldCartons = productItems.reduce((s, item) => s + getSoldCartons(item, ppc), 0);
    const totalBonus = productItems.reduce((s, i) => s + Number(i.bonusQuantity || 0), 0);
    const creditSales = sales.filter((s) => s.paymentType === "credit");
    const creditOutstanding = creditSales
      .filter((s) => !s.creditDetails?.fullyPaid)
      .reduce((s, sale) => s + Number(sale.creditDetails?.amountDue || 0), 0);

    // Product header block
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 140);
    doc.text(`Fiche de Stocks — ${product.name}`, left, y);
    doc.setTextColor(0, 0, 0);
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Agence: ${activeBranchName}`, left, y);
    y += 5;
    doc.text(`Stock actuel: ${formatCartonStock(product.stock, ppc)}${product.brand ? `   Marque: ${product.brand}` : ""}`, left, y);
    y += 5;
    doc.text(
      `Cartons vendus: ${totalSoldCartons}  |  Bonus: ${formatCartonStock(totalBonus, ppc)}  |  Crédit: ${creditSales.length}  |  Créances impayées: $${creditOutstanding.toFixed(2)}`,
      left, y
    );
    y += 8;

    // Sales table
    const sColW = [26, 44, 26, 22, 26, 22];
    const sHdrs = ["Date", "Client", "Quantité", "Bonus", "Paiement", "Total ($)"];

    checkPage(14);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(40, 70, 130);
    doc.rect(left, y - 4, pageW - 28, 6, "F");
    doc.setTextColor(255, 255, 255);
    let x = left;
    sHdrs.forEach((h, i) => { doc.text(h, x + 1, y); x += sColW[i]; });
    doc.setTextColor(0, 0, 0);
    y += 4;

    doc.setFont("helvetica", "normal");
    for (let i = 0; i < sales.length; i++) {
      checkPage(7);
      const sale = sales[i];
      const myItems = (sale.items || []).filter(
        (item) => item.productId === product._id || item.name === product.name
      );
      const soldCartons = myItems.reduce((s, item) => s + getSoldCartons(item, ppc), 0);
      const bonus = myItems.reduce((s, item) => s + Number(item.bonusQuantity || 0), 0);
      const productTotal = myItems.reduce((s, item) => s + Number(item.total || 0), 0);
      if (i % 2 === 0) { doc.setFillColor(235, 242, 255); doc.rect(left, y - 4, pageW - 28, 6, "F"); }
      const row = [
        new Date(sale.createdAt).toLocaleDateString("fr-FR"),
        getCustomerDisplayName(sale.customer?.name).slice(0, 22),
        `${soldCartons} carton${soldCartons > 1 ? "s" : ""}`.slice(0, 14),
        bonus > 0 ? formatCartonStock(bonus, ppc).slice(0, 10) : "—",
        (sale.paymentType === "credit" ? "Crédit" : (sale.paymentMethod || "Espèces")).slice(0, 12),
        `$${productTotal.toFixed(2)}`,
      ];
      x = left;
      row.forEach((cell, j) => { doc.text(cell, x + 1, y); x += sColW[j]; });
      y += 5;
    }

    // Totals row
    checkPage(8);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(190, 210, 250);
    doc.rect(left, y - 4, pageW - 28, 6, "F");
    doc.text("TOTAL", left + 1, y);
    x = left + sColW[0] + sColW[1];
    doc.text(`${totalSoldCartons} carton${totalSoldCartons > 1 ? "s" : ""}`.slice(0, 14), x + 1, y); x += sColW[2];
    doc.text(totalBonus > 0 ? formatCartonStock(totalBonus, ppc).slice(0, 10) : "—", x + 1, y); x += sColW[3] + sColW[4];
    doc.text(`$${productItems.reduce((s, item) => s + Number(item.total || 0), 0).toFixed(2)}`, x + 1, y);
    y += 10;

    // Credit section
    if (creditSales.length > 0) {
      checkPage(16);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Ventes à Crédit", left, y);
      y += 6;

      const cColW = [26, 44, 24, 22, 22, 22];
      const cHdrs = ["Date", "Client", "Total Vente", "Payé", "Solde Dû", "Statut"];
      doc.setFontSize(8);
      doc.setFillColor(160, 100, 20);
      doc.rect(left, y - 4, pageW - 28, 6, "F");
      doc.setTextColor(255, 255, 255);
      x = left;
      cHdrs.forEach((h, i) => { doc.text(h, x + 1, y); x += cColW[i]; });
      doc.setTextColor(0, 0, 0);
      y += 4;

      doc.setFont("helvetica", "normal");
      creditSales.forEach((sale, i) => {
        checkPage(7);
        if (i % 2 === 0) { doc.setFillColor(255, 248, 225); doc.rect(left, y - 4, pageW - 28, 6, "F"); }
        const paid = Number(sale.creditDetails?.amountPaid || 0);
        const due = Number(sale.creditDetails?.amountDue || 0);
        const row = [
          new Date(sale.createdAt).toLocaleDateString("fr-FR"),
          getCustomerDisplayName(sale.customer?.name).slice(0, 22),
          `$${Number(sale.total || 0).toFixed(2)}`,
          `$${paid.toFixed(2)}`,
          `$${due.toFixed(2)}`,
          sale.creditDetails?.fullyPaid ? "Soldé" : "En cours",
        ];
        x = left;
        row.forEach((cell, j) => { doc.text(cell, x + 1, y); x += cColW[j]; });
        y += 5;
      });

      if (creditOutstanding > 0) {
        checkPage(8);
        y += 2;
        doc.setFont("helvetica", "bold");
        doc.text(`Total créances impayées: $${creditOutstanding.toFixed(2)}`, pageW - left, y, { align: "right" });
        y += 8;
      }
    }

    return y + 8;
  };

  // Renders the professional Fiche de Stock PDF straight from the ledger response
  // already displayed in the "Résumé du stock" tab — same numbers, same source,
  // so the PDF can never disagree with what's on screen.
  const downloadFichePDF = () => {
    if (!ficheProduct || !ficheLedger) {
      toast.error("Les données de la fiche de stock ne sont pas encore chargées");
      return;
    }
    const ledger = ficheLedger;
    const ppc = getPiecesPerCarton({ piecesPerCarton: ledger.product.piecesPerCarton });
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const left = 14;
    let y = 16;

    const checkPage = (needed = 10) => {
      if (y + needed > pageH - 18) { doc.addPage(); y = 20; }
    };

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 60, 140);
    doc.text(COMPANY_NAME, pageW / 2, y, { align: "center" });
    y += 7;
    doc.setFontSize(12);
    doc.text("FICHE DE STOCK", pageW / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(90, 90, 90);
    doc.text("Mouvement de Stock & Audit d'Inventaire", pageW / 2, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 9;

    // Product & period info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Agence: ${ledger.branch?.name || "Butembo"}`, left, y);
    y += 5;
    doc.text(`Article: ${ledger.product.name}`, left, y);
    doc.text(`Statut: ${getProductStatus(ledger.product.status)}`, pageW - left, y, { align: "right" });
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Catégorie: ${ledger.product.category || "—"}`, left, y);
    y += 5;
    doc.text(
      `Période (${FICHE_RANGE_LABELS[ficheRange]}): ${new Date(ledger.period.start).toLocaleDateString("fr-FR")} — ${new Date(ledger.period.end).toLocaleDateString("fr-FR")}`,
      left, y
    );
    y += 5;
    doc.text(`Généré le: ${new Date().toLocaleString("fr-FR")}`, left, y);
    y += 5;
    doc.text(`Généré par: ${currentUser?.username || "Utilisateur inconnu"}`, left, y);
    y += 8;

    // Summary block
    checkPage(20);
    doc.setDrawColor(30, 60, 140);
    doc.setLineWidth(0.3);
    doc.line(left, y, pageW - left, y);
    y += 6;
    const summaryCols: { label: string; value: string; color: [number, number, number] }[] = [
      { label: "STOCK DE DÉPART", value: `${ledger.summary.startingStock}`, color: [0, 0, 0] },
      { label: "STOCK AJOUTÉ", value: `+${ledger.summary.added}`, color: [20, 130, 60] },
      { label: "STOCK RÉDUIT", value: `-${ledger.summary.removed}`, color: [180, 40, 40] },
      { label: "STOCK FINAL", value: `${ledger.summary.endingStock}`, color: [30, 60, 140] },
    ];
    const colW4 = (pageW - left * 2) / 4;
    summaryCols.forEach((col, i) => {
      const x = left + i * colW4;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text(col.label, x, y);
      doc.setFontSize(13);
      doc.setTextColor(col.color[0], col.color[1], col.color[2]);
      doc.text(col.value, x, y + 7);
    });
    doc.setTextColor(0, 0, 0);
    y += 14;
    doc.line(left, y, pageW - left, y);
    y += 8;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Stock actuel: ${formatCartonStock(ledger.product.currentStock, ppc)}   |   ${ledger.summary.actionsCount} action(s) de stock sur la période`,
      left, y
    );
    y += 8;

    // Actions table
    checkPage(14);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Journal des mouvements de stock", left, y);
    y += 6;

    const headers = ["Date", "Action", "Source", "Référence", "Préc.", "Var.", "Nouv.", "Par", "Raison"];
    const colWidths = [22, 24, 22, 24, 14, 14, 14, 22, 26];

    const drawTableHeader = () => {
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setFillColor(40, 70, 130);
      doc.rect(left, y - 4, pageW - left * 2, 6, "F");
      doc.setTextColor(255, 255, 255);
      let headerX = left;
      headers.forEach((header, index) => {
        doc.text(header, headerX + 1, y);
        headerX += colWidths[index];
      });
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += 4;
    };

    const drawContinuationHeader = () => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 60, 140);
      doc.text(COMPANY_NAME, pageW / 2, 14, { align: "center" });
      doc.setFontSize(8);
      doc.setTextColor(70, 70, 70);
      doc.text(
        `FICHE DE STOCK · Agence: ${ledger.branch?.name || "Butembo"} · Article: ${ledger.product.name}`,
        pageW / 2,
        20,
        { align: "center", maxWidth: pageW - left * 2 }
      );
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text("Journal des mouvements de stock (suite)", left, 28);
      y = 35;
      drawTableHeader();
    };

    checkPage(8);
    drawTableHeader();

    doc.setFont("helvetica", "normal");
    if (ledger.actions.length === 0) {
      checkPage(8);
      doc.setFontSize(8);
      doc.text("Aucune action de stock enregistrée pour cette période.", left, y);
      y += 6;
    } else {
      ledger.actions.forEach((action, i) => {
        const values = [
          new Date(action.date).toLocaleDateString("fr-FR"),
          action.label,
          action.source,
          action.reference || "—",
          `${action.previousStock}`,
          `${action.change >= 0 ? "+" : ""}${action.change}`,
          `${action.newStock}`,
          action.performedBy || "—",
          action.reason || "—",
        ];
        const wrappedValues = values.map((value, index) =>
          doc.splitTextToSize(value, Math.max(5, colWidths[index] - 2)) as string[]
        );
        const lineCount = Math.max(...wrappedValues.map((lines) => lines.length), 1);
        const rowHeight = Math.max(6, lineCount * 3.2 + 1.5);
        if (y + rowHeight > pageH - 18) {
          doc.addPage();
          drawContinuationHeader();
        }
        if (i % 2 === 0) {
          doc.setFillColor(235, 242, 255);
          doc.rect(left, y - 4, pageW - left * 2, rowHeight, "F");
        }
        let x = left;
        doc.setFontSize(7);
        wrappedValues.forEach((lines, index) => {
          if (index === 5) {
            doc.setTextColor(action.change >= 0 ? 20 : 180, action.change >= 0 ? 130 : 40, action.change >= 0 ? 60 : 40);
          } else {
            doc.setTextColor(0, 0, 0);
          }
          doc.text(lines, x + 1, y);
          x += colWidths[index];
        });
        y += rowHeight;
      });
    }

    // Footer with page numbers on every page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 90, 90);
      doc.text("Généré par le Système de Gestion d'Inventaire", left, pageH - 8);
      doc.text(`Page ${i}/${totalPages}`, pageW - left, pageH - 8, { align: "right" });
    }

    doc.save(`fiche-de-stock-${ficheProduct.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const downloadAllFichesPDF = async () => {
    if (products.length === 0) return;
    toast.info("Génération du PDF en cours...");

    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${serverUrl}/sales?from=1970-01-01&to=${today}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (!res.ok) { toast.error("Impossible de charger les ventes"); return; }

      const json = await res.json();
      const allSales: FicheSale[] = Array.isArray(json?.data) ? json.data : [];

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Cover page
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 60, 140);
      doc.text(COMPANY_NAME, pageW / 2, pageH / 2 - 16, { align: "center" });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Fiches de Stocks — Tous les Articles", pageW / 2, pageH / 2, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Généré le: ${new Date().toLocaleDateString("fr-FR")}`, pageW / 2, pageH / 2 + 10, { align: "center" });
      doc.text(`Agence: ${activeBranchName}`, pageW / 2, pageH / 2 + 15, { align: "center" });
      doc.text(`Nombre d'articles: ${products.length}`, pageW / 2, pageH / 2 + 21, { align: "center" });

      for (const product of products) {
        doc.addPage();
        const productSales = allSales.filter((sale) =>
          (sale.items || []).some(
            (item) => item.productId === product._id || item.name === product.name
          )
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Per-product page header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 60, 140);
        doc.text(COMPANY_NAME, pageW / 2, 14, { align: "center" });
        doc.setTextColor(0, 0, 0);

        buildFichePDF(doc, product, productSales, 22);
      }

      // Page numbers
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(COMPANY_NAME, 14, pageH - 8);
        doc.text(`Page ${i}/${total}`, pageW / 2, pageH - 8, { align: "center" });
      }

      doc.save(`fiches-stock-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF téléchargé avec succès");
    } catch {
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  useEffect(() => {
    fetchProducts();

    const handleProductsUpdated = () => fetchProducts();
    window.addEventListener("appDataChanged", handleProductsUpdated);
    return () => {
      window.removeEventListener("appDataChanged", handleProductsUpdated);
    };
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
    setEditReason("");
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
      updateProduct(selectedProduct._id, { ...productData, reason: editReason.trim() });
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
    setEditReason("");
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
              ? "text-rose-600"
              : "text-slate-900"
          }`}
        >
          {formatCartonStock(product.stock, piecesPerCarton)}
        </span>
      );
    } else {
      // Staff sees stock status instead of exact numbers
      if (product.stock === 0) {
        return (
          <span className="text-sm text-rose-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            En rupture
          </span>
        );
      } else if (product.stock <= product.minStock) {
        return (
          <span className="text-sm text-orange-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Stock faible
          </span>
        );
      } else {
        return (
          <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
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
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="text-slate-500">Stock Actuel:</span>
            <span
              className={`font-medium ${
                product.stock <= product.minStock
                  ? "text-rose-600"
                  : "text-slate-900"
              }`}
            >
              {formatCartonStock(product.stock, piecesPerCarton)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="text-slate-500">Pièces par carton:</span>
            <span className="font-medium text-slate-900">
              {piecesPerCarton} pièce{piecesPerCarton > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="text-slate-500">Stock minimal:</span>
            <span className="font-medium text-slate-900">
              {formatCartonStock(product.minStock, piecesPerCarton)}
            </span>
          </div>
        </>
      );
    } else {
      // Staff sees only stock status
      return (
        <div className="flex justify-between py-2 border-b border-slate-200">
          <span className="text-slate-500">Statut du stock:</span>
          {product.stock === 0 ? (
            <span className="font-medium text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              En rupture
            </span>
          ) : product.stock <= product.minStock ? (
            <span className="font-medium text-orange-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Stock faible
            </span>
          ) : (
            <span className="font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              En stock
            </span>
          )}
        </div>
      );
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950 flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            Articles
          </h1>
          <p className="text-slate-600">Gérez votre catalogue des Articles</p>
          {!isAdmin && (
            <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
              Staff - Vue limitée
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={downloadAllFichesPDF}
              className="bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg border border-purple-400/30"
              title="Télécharger les fiches de tous les articles"
            >
              <Download className="w-4 h-4" />
              Toutes les fiches PDF
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 shadow-lg shadow-blue-900/50 border border-blue-400/30"
            >
              <Plus className="w-4 h-4" />
              Ajouter un nouvel Article
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 shadow-sm p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
              <input
                type="text"
                placeholder="Recherchez des Articles par nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900 placeholder-slate-400"
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
      <div className="bg-white border border-slate-200 shadow-sm rounded-lg">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Chargement des Articles......</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-blue-600/50" />
            <p className="text-slate-600">Aucun article trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Article
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product: Product, idx: number) => (
                  <tr key={product._id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-950">
                            {product.name}
                          </div>
                          <div className="text-sm text-slate-500">
                            {product.brand || "Sans marque"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStockInfo(product)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {getProductStatus(product.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(product)}
                          className="text-blue-600 hover:text-blue-700 p-1 rounded transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openFicheModal(product)}
                          className="text-purple-600 hover:text-purple-700 p-1 rounded transition-colors"
                          title="Fiche de stocks"
                        >
                          <ClipboardList className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(product)}
                              className="text-emerald-600 hover:text-emerald-700 p-1 rounded transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {product.status === "active" ? (
                              <button
                                onClick={() => deactivateProduct(product._id)}
                                className="text-rose-600 hover:text-rose-700 p-1 rounded transition-colors"
                                title="Désactiver"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => reactivateProduct(product._id)}
                                className="text-emerald-600 hover:text-emerald-700 p-1 rounded transition-colors"
                                title="Réactiver"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
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
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
                  {showEditModal ? (
                    <>
                      <Edit className="w-5 h-5 text-blue-600" />
                      Modifier l'Article
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-blue-600" />
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
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-blue-600 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Tag className="w-4 h-4" />
                    Information Basique
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
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
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900 placeholder-slate-400"
                      placeholder="Ex: Widget Pro X200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
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
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900 placeholder-slate-400"
                      placeholder="Description du produit..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
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
                    <label className="block text-sm font-medium text-slate-600 mb-1">
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
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900 placeholder-slate-400"
                      placeholder="Ex: Apple, Samsung, Nike"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
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
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900"
                    >
                      <option value="active" className="bg-white">Actif</option>
                      <option value="inactive" className="bg-white">Inactif</option>
                    </select>
                  </div>
                </div>

                {/* Box Management - Simplified */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-blue-600 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Box className="w-4 h-4" />
                    Gestion par Boîtes
                  </h3>

                  {/* Number of Boxes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Nombre de boîtes *
                    </label>
                    <div className="relative">
                      <Package className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
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
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900"
                        placeholder="Ex: 5"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Nombre total de boîtes en stock
                    </p>
                  </div>

                  {/* Pieces Per Box */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Pièces par boîte *
                    </label>
                    <div className="relative">
                      <Layers className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
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
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900"
                        placeholder="Ex: 12"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Exemple: Si chaque boîte contient 12 pièces, entrez 12
                    </p>
                  </div>

                  {/* Stock Summary */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>Stock total:</span>
                      <strong className="text-slate-950 text-lg">
                        {formatCartonStock(
                          formData.cartonStock * formData.piecesPerCarton + formData.loosePieces,
                          formData.piecesPerCarton
                        )}
                      </strong>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      ({formData.cartonStock} boîte{formData.cartonStock > 1 ? "s" : ""} × {formData.piecesPerCarton} pièces/boîte)
                    </div>
                  </div>

                  {/* Reason for a manual stock adjustment — only meaningful when editing */}
                  {showEditModal && selectedProduct && (
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-1">
                        Raison de l'ajustement du stock (optionnel)
                      </label>
                      <input
                        type="text"
                        value={editReason}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditReason(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900 placeholder-slate-400"
                        placeholder="Ex: Correction après inventaire physique"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Enregistré dans la Fiche de Stock uniquement si le stock change réellement.
                      </p>
                    </div>
                  )}

                  {/* Minimum Stock Alert */}
                  <div className="border-t border-slate-200 pt-4 mt-2">
                    <h4 className="text-sm font-medium text-slate-600 mb-3">
                      Seuil d'alerte (Stock minimum)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
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
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
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
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Alerte quand stock {'<'} {formatCartonStock(
                        formData.minStockCartons * formData.piecesPerCarton + formData.minStockPieces,
                        formData.piecesPerCarton
                      )}
                    </div>
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Poids (kg)
                    </label>
                    <div className="relative">
                      <Scale className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-600" />
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
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none focus:border-transparent text-slate-900"
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
              <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
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

      {/* Fiche de Stocks Modal */}
      {showFicheModal && ficheProduct && (() => {
        const ppc = getPiecesPerCarton(ficheProduct);
        // Items for this product from all sales
        const productItems = ficheSales.flatMap((sale) =>
          (sale.items || [])
            .filter((item) => item.productId === ficheProduct._id || item.name === ficheProduct.name)
            .map((item) => ({ ...item, sale }))
        );
        const totalSoldCartons = productItems.reduce((s, item) => s + getSoldCartons(item, ppc), 0);
        const totalBonus = productItems.reduce((s, i) => s + Number(i.bonusQuantity || 0), 0);
        const creditSales = ficheSales.filter((s) => s.paymentType === "credit");
        const creditOutstanding = creditSales
          .filter((s) => !s.creditDetails?.fullyPaid)
          .reduce((s, sale) => s + Number(sale.creditDetails?.amountDue || 0), 0);

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
              {/* Sticky header */}
              <div className="p-6 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-purple-600" />
                      Fiche de stocks — {ficheProduct.name}
                    </h2>
                    {ficheLedger?.branch && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Agence de {ficheLedger.branch.name}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 mt-1">
                      Stock actuel:{" "}
                      <span className="font-semibold text-slate-950">
                        {formatCartonStock(ficheProduct.stock, ppc)}
                      </span>
                      {ficheProduct.brand && (
                        <span className="ml-3 text-slate-500">{ficheProduct.brand}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Créé le {new Date(ficheProduct.createdAt).toLocaleString("fr-FR")} · Dernière modification le{" "}
                      {new Date(ficheProduct.updatedAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => loadFicheData(ficheProduct)}
                      className="text-purple-600 hover:text-purple-700 p-1 rounded transition-colors"
                      title="Actualiser"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={downloadFichePDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors"
                      title="Télécharger la fiche en PDF"
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                    <button onClick={closeFicheModal} className="text-purple-600 hover:text-purple-700 transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {[
                    { label: "Cartons vendus", value: totalSoldCartons, icon: <TrendingDown className="w-4 h-4" />, color: "blue" },
                    { label: "Bonus donnés", value: totalBonus, icon: <TrendingDown className="w-4 h-4" />, color: "green" },
                    { label: "Ventes à crédit", value: creditSales.length, icon: <CreditCard className="w-4 h-4" />, color: "amber" },
                    {
                      label: "Créances impayées",
                      value: `$${creditOutstanding.toFixed(2)}`,
                      icon: <TrendingUp className="w-4 h-4" />,
                      color: creditOutstanding > 0 ? "red" : "purple",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className={`rounded-lg p-3 border bg-slate-50 ${
                        card.color === "amber" ? "border-amber-200"
                        : card.color === "green" ? "border-emerald-200"
                        : card.color === "red" ? "border-rose-200"
                        : card.color === "blue" ? "border-blue-200"
                        : "border-purple-200"
                      }`}
                    >
                      <div className={`flex items-center gap-1 text-xs mb-1 ${
                        card.color === "amber" ? "text-amber-600"
                        : card.color === "green" ? "text-emerald-600"
                        : card.color === "red" ? "text-rose-600"
                        : card.color === "blue" ? "text-blue-600"
                        : "text-purple-600"
                      }`}>
                        {card.icon} {card.label}
                      </div>
                      <div className="text-xl font-bold text-slate-950">{card.value}</div>
                    </div>
                  ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4 bg-slate-50 rounded-lg p-1 flex-wrap">
                  {(
                    [
                      { key: "summary" as const, label: "Résumé du stock", icon: <History className="w-3.5 h-3.5" /> },
                      { key: "bonus" as const, label: "Bonus donnés", icon: <TrendingDown className="w-3.5 h-3.5" /> },
                      { key: "credit" as const, label: "Crédit / Prêts", icon: <CreditCard className="w-3.5 h-3.5" /> },
                    ]
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFicheTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        ficheTab === tab.key
                          ? "bg-blue-700 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="p-6">
                {ficheLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
                    <p className="mt-3 text-slate-600">Chargement de l'historique...</p>
                  </div>
                ) : (
                  <>
                    {/* Bonus tab */}
                    {ficheTab === "bonus" && (
                      <div>
                        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">
                          Ventes avec bonus pour cet article
                        </p>
                        {productItems.filter((i) => (i.bonusQuantity || 0) > 0).length === 0 ? (
                          <p className="text-slate-500 text-sm py-10 text-center">
                            Aucun bonus enregistré pour cet article dans les ventes.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {productItems
                              .filter((i) => (i.bonusQuantity || 0) > 0)
                              .map((i, idx) => (
                                <div key={idx} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-slate-950 font-medium">{getCustomerDisplayName(i.sale.customer?.name)}</p>
                                    <p className="text-sm text-slate-500">
                                      {new Date(i.sale.createdAt).toLocaleDateString("fr-FR")} · Vente #{i.sale.saleId || i.sale._id.slice(-6)}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-emerald-600 font-bold">
                                      +{formatCartonStock(Number(i.bonusQuantity || 0), ppc)} bonus
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Vendu: {getSoldCartons(i, ppc)} carton{getSoldCartons(i, ppc) > 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-right mt-2">
                              <span className="text-emerald-600 font-bold">
                                Total bonus: {formatCartonStock(totalBonus, ppc)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Credit/Loans tab */}
                    {ficheTab === "credit" && (
                      <div>
                        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider">
                          Ventes à crédit — données depuis NewSale
                        </p>
                        {creditSales.length === 0 ? (
                          <p className="text-slate-500 text-sm py-10 text-center">
                            Aucune vente à crédit enregistrée pour cet article.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {creditSales.map((sale) => {
                              const paid = Number(sale.creditDetails?.amountPaid || 0);
                              const due = Number(sale.creditDetails?.amountDue || 0);
                              const fullyPaid = sale.creditDetails?.fullyPaid ?? false;
                              return (
                                <div
                                  key={sale._id}
                                  className={`rounded-lg border p-4 ${
                                    fullyPaid
                                      ? "border-emerald-200 bg-emerald-50"
                                      : "border-amber-200 bg-amber-50"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-slate-950">
                                          {getCustomerDisplayName(sale.customer?.name)}
                                        </span>
                                        {sale.customer?.phone && (
                                          <span className="text-xs text-slate-500">{sale.customer.phone}</span>
                                        )}
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                                            fullyPaid
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : due > 0
                                              ? "bg-amber-50 text-amber-700 border-amber-200"
                                              : "bg-blue-50 text-blue-700 border-blue-200"
                                          }`}
                                        >
                                          {fullyPaid ? "Soldé" : "En cours"}
                                        </span>
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                        <div>
                                          <p className="text-slate-500 mb-0.5">Total vente</p>
                                          <p className="text-slate-950 font-semibold">${Number(sale.total || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 mb-0.5">Payé</p>
                                          <p className="text-emerald-600 font-semibold">${paid.toFixed(2)}</p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500 mb-0.5">Solde dû</p>
                                          <p className={`font-semibold ${due > 0 ? "text-rose-600" : "text-slate-500"}`}>
                                            ${due.toFixed(2)}
                                          </p>
                                        </div>
                                        {sale.creditDetails?.dueDate && (
                                          <div>
                                            <p className="text-slate-500 mb-0.5">Échéance</p>
                                            <p className="text-slate-950">
                                              {new Date(sale.creditDetails.dueDate).toLocaleDateString("fr-FR")}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500 mt-2">
                                        Vente du {new Date(sale.createdAt).toLocaleDateString("fr-FR")} · #{sale.saleId || sale._id.slice(-6)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            {creditOutstanding > 0 && (
                              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-right">
                                <span className="text-amber-700 font-bold text-sm">
                                  Total créances impayées : ${creditOutstanding.toFixed(2)}
                                </span>
                                <p className="text-xs text-amber-600 mt-0.5">
                                  Gérez les paiements depuis l'onglet Historique des ventes
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stock summary tab — starting/ending inventory + audit trail for the selected period */}
                    {ficheTab === "summary" && (
                      <div>
                        {/* Period selector */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {(["today", "week", "month"] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => ficheProduct && applyFicheRange(ficheProduct, r)}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                ficheRange === r
                                  ? "bg-purple-700 text-white"
                                  : "bg-slate-50 text-purple-600 hover:bg-purple-50"
                              }`}
                            >
                              {FICHE_RANGE_LABELS[r]}
                            </button>
                          ))}
                          <button
                            onClick={() => setFicheRange("custom")}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                              ficheRange === "custom"
                                ? "bg-purple-700 text-white"
                                : "bg-slate-50 text-purple-600 hover:bg-purple-50"
                            }`}
                          >
                            Personnalisé
                          </button>
                          {ficheRange === "custom" && (
                            <div className="flex items-center gap-2 ml-1">
                              <input
                                type="date"
                                value={ficheCustomFrom}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFicheCustomFrom(e.target.value)}
                                className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
                              />
                              <span className="text-slate-500 text-sm">à</span>
                              <input
                                type="date"
                                value={ficheCustomTo}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFicheCustomTo(e.target.value)}
                                className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
                              />
                              <button
                                onClick={() => ficheProduct && applyFicheCustomRange(ficheProduct)}
                                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-md text-sm font-medium"
                              >
                                Appliquer
                              </button>
                            </div>
                          )}
                        </div>

                        {ficheLedgerLoading ? (
                          <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
                          </div>
                        ) : !ficheLedger ? (
                          <p className="text-slate-500 text-sm py-10 text-center">
                            Impossible de charger la fiche de stock pour cette période.
                          </p>
                        ) : (
                          <>
                            {/* Summary cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                              <div className="rounded-lg p-3 border border-blue-200 bg-slate-50">
                                <div className="text-xs text-blue-600 mb-1">Stock de départ</div>
                                <div className="text-xl font-bold text-slate-950">{ficheLedger.summary.startingStock}</div>
                              </div>
                              <div className="rounded-lg p-3 border border-emerald-200 bg-slate-50">
                                <div className="text-xs text-emerald-600 mb-1">Stock ajouté</div>
                                <div className="text-xl font-bold text-slate-950">+{ficheLedger.summary.added}</div>
                              </div>
                              <div className="rounded-lg p-3 border border-rose-200 bg-slate-50">
                                <div className="text-xs text-rose-600 mb-1">Stock réduit</div>
                                <div className="text-xl font-bold text-slate-950">-{ficheLedger.summary.removed}</div>
                              </div>
                              <div className="rounded-lg p-3 border border-purple-200 bg-slate-50">
                                <div className="text-xs text-purple-600 mb-1">Stock final</div>
                                <div className="text-xl font-bold text-slate-950">{ficheLedger.summary.endingStock}</div>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">
                              Stock actuel:{" "}
                              <span className="text-slate-950 font-medium">
                                {formatCartonStock(ficheLedger.product.currentStock, ppc)}
                              </span>
                              {" · "}Agence: {ficheLedger.branch?.name || "Butembo"}
                              {" · "}Statut:{" "}
                              <span className="text-slate-950 font-medium">
                                {getProductStatus(ficheLedger.product.status)}
                              </span>
                              {" · "}
                              {ficheLedger.summary.actionsCount} action{ficheLedger.summary.actionsCount > 1 ? "s" : ""} de stock sur la période
                            </p>

                            {/* Audit trail */}
                            {ficheLedger.actions.length === 0 ? (
                              <p className="text-slate-500 text-sm py-10 text-center">
                                Aucune action de stock enregistrée pour cette période.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="border-b border-slate-200">
                                    <tr>
                                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Date</th>
                                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Action</th>
                                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Source</th>
                                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Référence</th>
                                      <th className="text-right py-2 pr-3 text-slate-500 font-medium">Précédent</th>
                                      <th className="text-right py-2 pr-3 text-slate-500 font-medium">Variation</th>
                                      <th className="text-right py-2 pr-3 text-slate-500 font-medium">Nouveau stock</th>
                                      <th className="text-left py-2 pr-3 text-slate-500 font-medium">Effectué par</th>
                                      <th className="text-left py-2 text-slate-500 font-medium">Raison</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {ficheLedger.actions.map((action) => (
                                      <tr key={action.id} className="hover:bg-slate-50">
                                        <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                                          {new Date(action.date).toLocaleString("fr-FR")}
                                        </td>
                                        <td className="py-2.5 pr-3 text-slate-950 font-medium">{action.label}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{action.source}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{action.reference || "—"}</td>
                                        <td className="py-2.5 pr-3 text-right text-slate-600">{action.previousStock}</td>
                                        <td
                                          className={`py-2.5 pr-3 text-right font-semibold ${
                                            action.change >= 0 ? "text-emerald-600" : "text-rose-600"
                                          }`}
                                        >
                                          {action.change >= 0 ? "+" : ""}
                                          {action.change}
                                        </td>
                                        <td className="py-2.5 pr-3 text-right text-slate-950 font-medium">{action.newStock}</td>
                                        <td className="py-2.5 pr-3 text-slate-600">{action.performedBy || "—"}</td>
                                        <td className="py-2.5 text-slate-600">{action.reason || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quick View Modal */}
      {showViewModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-950 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Détails de l'Article
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-950">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-slate-500 mt-1">{selectedProduct.brand || "Sans marque"}</p>
                  <p className="text-slate-500 mt-2">
                    {selectedProduct.description || "Aucune description"}
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedProduct.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {getProductStatus(selectedProduct.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Informations
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-slate-500">Catégorie:</span>
                      <span className="font-medium text-slate-900">
                        {selectedProduct.category}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-slate-500">Unité:</span>
                      <span className="font-medium text-slate-900">
                        {selectedProduct.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-600 flex items-center gap-2">
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
                  <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Propriétés physiques
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-200">
                      <span className="text-slate-500">Poids:</span>
                      <span className="font-medium text-slate-900">
                        {selectedProduct.weight} kg
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
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
