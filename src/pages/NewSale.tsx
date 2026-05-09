/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { 
  DollarSign, 
  RefreshCw, 
  Calculator, 
  Search,
  ShoppingCart,
  User,
  Phone,
  Mail,
  Package,
  Trash2,
  Plus
} from "lucide-react";

interface Product {
  _id: string;
  name: string;
  sku?: string;
  stock: number;
  piecesPerCarton?: number;
  price?: number;
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  paidQuantity: number;
  bonusQuantity: number;
  piecesPerCarton: number;
  boxPrice: number;
  unitPrice: number;
  total: number;
}

interface ExchangeRate {
  rate: number;
  effectiveFrom: string;
  lastUpdated: string;
}

const API_BASE = import.meta.env.VITE_API_URL;

function getPiecesPerCarton(product?: Pick<Product, "piecesPerCarton"> | null) {
  return Math.max(1, Math.floor(Number(product?.piecesPerCarton || 1)));
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
    return `${safeTotal} piece${safeTotal > 1 ? "s" : ""}`;
  }
  const { cartons, pieces } = splitStock(totalPieces, piecesPerCarton);
  const cartonLabel = cartons > 1 ? "cartons" : "carton";
  if (pieces === 0) return `${cartons} ${cartonLabel}`;
  return `${cartons} ${cartonLabel} et ${pieces} pièce${pieces > 1 ? "s" : ""}`;
}

function formatSaleQuantity(
  item: Pick<CartItem, "paidQuantity" | "bonusQuantity" | "piecesPerCarton">
) {
  const paid = formatCartonStock(item.paidQuantity, item.piecesPerCarton);
  if (!item.bonusQuantity) return paid;
  return `${paid} (+${formatCartonStock(
    item.bonusQuantity,
    item.piecesPerCarton
  )} bonus)`;
}

function getBoxEquivalent(totalPieces: number, piecesPerCarton: number) {
  return totalPieces / Math.max(1, piecesPerCarton);
}

function getLineTotal(paidPieces: number, piecesPerCarton: number, boxPrice: number) {
  return getBoxEquivalent(paidPieces, piecesPerCarton) * boxPrice;
}

function formatGmt2DateTime(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatGmt2Date(value: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

type UiPayment = "cash" | "mpesa" | "card" | "bank" | "other";
type ModelPayment = "cash" | "card" | "transfer" | "other";

function uiToModelPayment(pm: UiPayment): ModelPayment {
  if (pm === "cash") return "cash";
  if (pm === "card") return "card";
  if (pm === "mpesa" || pm === "bank") return "transfer";
  return "other";
}

async function readJsonSafe(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  const text = await res.text();
  return { __nonJson: true, text };
}

// Simplified Print service for ESC/POS printing
class PrintService {
  static async printReceipt(
    receiptData: any,
    type: "sale" | "reservation" = "sale"
  ): Promise<boolean> {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/print/receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ receiptData, type }),
      });

      if (!response.ok) {
        throw new Error("Failed to print receipt");
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Print receipt error:", error);
      throw error;
    }
  }

  static async printStub(
    receiptData: any,
    type: "sale" | "reservation" = "sale"
  ): Promise<boolean> {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/print/stub`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ receiptData, type }),
      });

      if (!response.ok) {
        throw new Error("Failed to print stub");
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Print stub error:", error);
      throw error;
    }
  }
}

export default function NewSale() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Get the current user from your auth context
  const { user: currentUser } = useAuth();

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    cartonQuantity: "",
    looseQuantity: "",
    bonusCartons: "",
    bonusPieces: "",
    unitPrice: "",
    priceInFC: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    paymentMethod: "cash" as UiPayment,
    currencyMode: "usd" as "usd" | "fc" // New field for currency mode
  });

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = currentUser?.role === "admin";

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load exchange rate
  const loadExchangeRate = async () => {
    try {
      setLoadingRate(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/exchange-rates/current`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExchangeRate(data);
      } else {
        console.warn('Failed to load exchange rate');
      }
    } catch (error) {
      console.error('Error loading exchange rate:', error);
    } finally {
      setLoadingRate(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    
    async function loadInitialData() {
      setLoadingProducts(true);
      setError(null);
      
      try {
        // Load products and exchange rate concurrently
        await Promise.all([
          loadProducts(),
          loadExchangeRate()
        ]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load initial data");
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }

    async function loadProducts() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/products`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
        });
        const data = await readJsonSafe(res);
        if (!res.ok) {
          const msg =
            (data as any)?.error ||
            (data as any)?.text ||
            `Products fetch failed: ${res.status}`;
          throw new Error(msg);
        }
        const list: Product[] = Array.isArray((data as any)?.products)
          ? (data as any).products
          : Array.isArray(data) && !(data as any).__nonJson
          ? (data as any)
          : [];
        if (!cancelled) setProducts(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load products");
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  const product = useMemo(
    () => products.find((p) => p._id === form.productId),
    [products, form.productId]
  );

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  // Calculate USD price when FC price changes
  useEffect(() => {
    if (form.currencyMode === "fc" && form.priceInFC && exchangeRate) {
      const fcPrice = parseFloat(form.priceInFC) || 0;
      const usdPrice = fcPrice / exchangeRate.rate;
      setForm(prev => ({
        ...prev,
        unitPrice: usdPrice.toFixed(2)
      }));
    }
  }, [form.priceInFC, form.currencyMode, exchangeRate]);

  // Calculate FC price when USD price changes
  useEffect(() => {
    if (form.currencyMode === "usd" && form.unitPrice && exchangeRate) {
      const usdPrice = parseFloat(form.unitPrice) || 0;
      const fcPrice = usdPrice * exchangeRate.rate;
      setForm(prev => ({
        ...prev,
        priceInFC: Math.round(fcPrice).toString()
      }));
    }
  }, [form.unitPrice, form.currencyMode, exchangeRate]);

  const piecesPerCarton = getPiecesPerCarton(product);
  const paidCartons = parseInt(form.cartonQuantity) || 0;
  const paidLoosePieces = parseInt(form.quantity || form.looseQuantity) || 0;
  const bonusCartons = parseInt(form.bonusCartons) || 0;
  const bonusPieces = parseInt(form.bonusPieces) || 0;
  const paidQuantity = paidCartons * piecesPerCarton + paidLoosePieces;
  const bonusQuantity = bonusCartons * piecesPerCarton + bonusPieces;
  const quantity = paidQuantity + bonusQuantity;
  const unitPrice = parseFloat(form.unitPrice) || 0;
  const itemTotal = getLineTotal(paidQuantity, piecesPerCarton, unitPrice);
  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const isFormValid =
    cart.length > 0 &&
    form.customerName.trim() !== "" &&
    form.customerPhone.trim() !== "";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  // Handle product selection from search
  const handleProductSelect = (selectedProduct: Product) => {
    setForm(prev => ({
      ...prev,
      productId: selectedProduct._id,
      unitPrice: selectedProduct.price ? selectedProduct.price.toString() : "",
      priceInFC: ""
    }));
    setSearchTerm(selectedProduct.name);
    setShowSearchResults(false);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowSearchResults(true);
    if (!e.target.value) {
      setForm(prev => ({ ...prev, productId: "" }));
    }
  };

  // Check if adding to cart would result in negative stock
  const checkStockAfterAdd = (productId: string, quantityToAdd: number): boolean => {
    const productToCheck = products.find(p => p._id === productId);
    if (!productToCheck) return false;

    // Calculate current stock minus what's already in cart
    const currentCartQuantity = cart
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    const availableStock = productToCheck.stock - currentCartQuantity;
    return availableStock >= quantityToAdd;
  };

  // Toggle between USD and FC input modes
  const toggleCurrencyMode = () => {
    setForm(prev => ({
      ...prev,
      currencyMode: prev.currencyMode === "usd" ? "fc" : "usd",
      unitPrice: "",
      priceInFC: ""
    }));
  };

  // Function to display stock information based on user role
  const renderStockInfo = (product: Product) => {
    const piecesPerCarton = getPiecesPerCarton(product);
    if (isAdmin) {
      // Admin sees exact stock numbers
      return `(Stock: ${formatCartonStock(product.stock, piecesPerCarton)})`;
    } else {
      // Staff sees stock status instead of exact numbers
      if (product.stock === 0) {
        return "(En rupture)";
      } else if (product.stock <= 5) { // You can adjust this threshold
        return "(Stock faible)";
      } else {
        return "(En stock)";
      }
    }
  };

  // Function to display available stock message based on user role
  const renderAvailableStockMessage = (product: Product, quantity: number) => {
    const canAddToCart = product && quantity > 0 && checkStockAfterAdd(product._id, quantity);
    const piecesPerCarton = getPiecesPerCarton(product);
    
    if (isAdmin) {
      // Admin sees exact numbers
      const currentCartQuantity = cart
        .filter(item => item.productId === product._id)
        .reduce((sum, item) => sum + item.quantity, 0);
      
      const availableStock = product.stock - currentCartQuantity;
      
      return (
        <p className="text-sm text-blue-300 mb-4 bg-black/30 p-3 rounded-lg border border-blue-800/30">
          Stock disponible:{" "}
          <strong className="text-white">
            {formatCartonStock(product.stock, piecesPerCarton)}
          </strong>
          {currentCartQuantity > 0 && (
            <span className="ml-2 text-blue-400">
              (Déjà dans panier: {formatCartonStock(currentCartQuantity, piecesPerCarton)})
            </span>
          )}
          {quantity > 0 && (
            <span className={`ml-4 ${canAddToCart ? 'text-green-400' : 'text-red-400'}`}>
              Stock restant après vente:{" "}
              {availableStock - quantity >= 0
                ? formatCartonStock(availableStock - quantity, piecesPerCarton)
                : "❌ pas assez de stock!"}
            </span>
          )}
        </p>
      );
    } else {
      // Staff sees status messages
      if (product.stock === 0) {
        return (
          <p className="text-sm text-red-400 mb-4 bg-red-900/30 p-3 rounded-lg border border-red-800/30">
            <strong>❌ En rupture de stock</strong>
          </p>
        );
      } else if (product.stock <= 5) {
        return (
          <p className="text-sm text-orange-400 mb-4 bg-orange-900/30 p-3 rounded-lg border border-orange-800/30">
            <strong>⚠️ Stock faible</strong>
          </p>
        );
      } else if (quantity > 0 && !canAddToCart) {
        return (
          <p className="text-sm text-red-400 mb-4 bg-red-900/30 p-3 rounded-lg border border-red-800/30">
            <strong>❌ Quantité demandée non disponible</strong>
          </p>
        );
      } else if (quantity > 0) {
        return (
          <p className="text-sm text-green-400 mb-4 bg-green-900/30 p-3 rounded-lg border border-green-800/30">
            <strong>✅ Stock suffisant</strong>
          </p>
        );
      } else {
        return (
          <p className="text-sm text-green-400 mb-4 bg-green-900/30 p-3 rounded-lg border border-green-800/30">
            <strong>✅ En stock</strong>
          </p>
        );
      }
    }
  };

  function handleAddToCart() {
    // Comprehensive validation
    if (!product) {
      setError("Veuillez sélectionner un produit");
      return;
    }

    if (quantity <= 0) {
      setError("La quantite ou le bonus doit etre superieur a zero");
      return;
    }

    if (paidLoosePieces >= piecesPerCarton || bonusPieces >= piecesPerCarton) {
      setError(`Les pièces doivent être inférieures à ${piecesPerCarton} par carton`);
      return;
    }

    if (paidQuantity > 0 && unitPrice <= 0) {
      setError("Le prix par boite doit etre superieur a zero");
      return;
    }

    // Check if adding this quantity would result in negative stock
    if (!checkStockAfterAdd(product._id, quantity)) {
      setError("Stock insuffisant pour ajouter cette quantité au panier");
      return;
    }

    // Clear any previous errors
    setError(null);

    // Check if product with same ID AND same price already exists in cart
    const existingItemIndex = cart.findIndex(
      (item) => item.productId === product._id && item.unitPrice === unitPrice
    );

    if (existingItemIndex >= 0) {
      // Update existing item (same product + same price)
      const updatedCart = [...cart];
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        quantity: updatedCart[existingItemIndex].quantity + quantity,
        paidQuantity: updatedCart[existingItemIndex].paidQuantity + paidQuantity,
        bonusQuantity: updatedCart[existingItemIndex].bonusQuantity + bonusQuantity,
        total: getLineTotal(
          updatedCart[existingItemIndex].paidQuantity + paidQuantity,
          piecesPerCarton,
          unitPrice
        ),
      };
      setCart(updatedCart);
    } else {
      // Add new item (either different product OR same product but different price)
      setCart([
        ...cart,
        {
          productId: product._id,
          name: product.name,
          quantity,
          paidQuantity,
          bonusQuantity,
          piecesPerCarton,
          boxPrice: unitPrice,
          unitPrice,
          total: itemTotal,
        },
      ]);
    }

    // Reset form fields
    setForm((f) => ({
      ...f,
      quantity: "",
      cartonQuantity: "",
      looseQuantity: "",
      bonusCartons: "",
      bonusPieces: "",
      unitPrice: product.price ? product.price.toString() : "",
      priceInFC: ""
    }));
    setSearchTerm("");
  }

  function removeFromCart(index: number) {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);

  }

  // Print function for receipt only
  const printReceiptOnly = () => {
    const printWindow = window.open("", "_blank", "width=320,height=600");
    if (printWindow) {
      printWindow.document.write(`
<html>
  <head>
    <title>Sale Receipt</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        margin: 0; 
        padding: 0; 
        font-size: 13px;
        font-weight: bold;
        line-height: 1.1;
        width: 72mm;
        background-color: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        display: flex;
        justify-content: center;
      }
      .receipt-container { 
        width: 70mm;
        margin: 0 auto;
        padding: 0.5mm;
        border: none;
        text-align: center;
      }
      .header { 
        text-align: center; 
        margin-bottom: 1mm; 
        padding-bottom: 1mm;
        border-bottom: 2px double #000;
      }
      .shop-name {
        font-size: 15px;
        font-weight: bold;
        margin-bottom: 0.5mm;
        text-transform: uppercase;
      }
      .shop-details {
        font-size: 11px;
        margin-bottom: 0.3mm;
        line-height: 1;
        font-weight: bold;
      }
      .receipt-info {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #f8f8f8;
        border-left: 3px solid #000;
      }
      .receipt-title {
        font-size: 13px;
        font-weight: bold;
        margin: 1mm 0;
        text-transform: uppercase;
        background-color: #000;
        color: white;
        padding: 1mm;
        border-radius: 2px;
      }
      .items-section {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #fafafa;
        border: 1px solid #eee;
      }
      .item-row { 
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5mm;
        padding: 0 1mm;
        border-bottom: 1px dotted #ddd;
      }
      .item-name {
        text-align: left;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .item-details {
        text-align: right;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .total-section { 
        font-weight: bold; 
        margin-top: 1mm;
        padding: 1mm;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.3mm;
        font-size: 13px;
        padding: 0 1mm;
      }
      .payment-method {
        text-transform: uppercase;
        font-weight: bold;
        font-size: 13px;
        color: #000;
      }
      .footer { 
        text-align: center; 
        margin-top: 1mm; 
        font-size: 11px;
        font-weight: bold;
        padding: 1mm;
        background-color: #f8f8f8;
        border-top: 1px dashed #000;
      }
      .sales-person {
        margin-top: 1mm;
        text-align: center;
        font-weight: bold;
        font-size: 12px;
        padding: 1mm;
        background-color: #e8e8e8;
        border: 1px solid #ccc;
        border-radius: 2px;
      }
      .customer-info {
        margin: 1mm 0;
        padding: 1mm;
        font-weight: bold;
        text-align: center;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .customer-field {
        margin-bottom: 0.3mm;
        font-size: 12px;
      }
      .separator {
        border-top: 1px dashed #000;
        margin: 1mm 0;
      }
      .cut-line {
        text-align: center;
        margin: 1mm 0;
        font-weight: bold;
        font-size: 11px;
        color: #000;
        letter-spacing: 1px;
      }
      .thank-you {
        font-weight: bold;
        margin: 0.5mm 0;
        font-size: 12px;
      }
      .warning {
        font-size: 10px;
        color: #000;
        margin: 0.3mm 0;
        font-weight: bold;
      }
      .section-divider {
        height: 2px;
        background: linear-gradient(to right, transparent, #000, transparent);
        margin: 1mm 0;
      }
      @media print {
        @page {
          margin: 0 !important;
          size: 72mm auto !important;
        }
        body { 
          margin: 0 !important; 
          padding: 0 !important; 
          width: 72mm !important;
          font-size: 13px !important;
          background: white !important;
          font-weight: bold !important;
          height: auto !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          display: flex !important;
          justify-content: center !important;
        }
        .receipt-container { 
          border: none !important; 
          box-shadow: none !important; 
          margin: 0 auto !important;
          padding: 0.5mm !important;
          width: 70mm !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }
        .cut-line {
          page-break-after: always !important;
          margin-bottom: 0 !important;
        }
        body::after,
        body::before {
          display: none !important;
          content: none !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="receipt-container">
      <div class="header">
        <div class="shop-name"><strong>${receiptData.shopName}</strong></div>
        <div class="shop-details"><strong>${receiptData.shopAddress}</strong></div>
        <div class="shop-details">TEL: <strong>${receiptData.shopNumber}</strong></div>
        <div class="shop-details"><strong>${receiptData.shopRegistration}</strong></div>
      </div>
      
      <div class="section-divider"></div>
      
      <div class="receipt-info">
        <div class="shop-details">DATE: <strong>${receiptData.date}</strong></div>
        <div class="shop-details">RECU #: <strong>${receiptData.receiptNumber}</strong></div>
      </div>
      
      <div class="customer-info">
        <div class="customer-field">CLIENT: <strong>${receiptData.customerName.toUpperCase()}</strong></div>
        <div class="customer-field">TELEPHONE: <strong>${receiptData.customerPhone}</strong></div>
        ${
          receiptData.customerEmail
            ? `<div class="customer-field">EMAIL: <strong>${receiptData.customerEmail}</strong></div>`
            : ""
        }
      </div>
      
      <div class="receipt-title">ARTICLES ACHETES</div>
      
      <div class="items-section">
      ${receiptData.items
        .map(
          (item: CartItem) => `
        <div class="item-row">
          <div class="item-name"><strong>${item.name}</strong></div>
          <div class="item-details">
            <strong>${formatSaleQuantity(item)} X $${item.unitPrice.toFixed(2)}</strong>
          </div>
        </div>
      `
        )
        .join("")}
      </div>
      
      <div class="total-section">
        <div class="total-row">
          <div><strong>SOUS-TOTAL:</strong></div>
          <div><strong>$${receiptData.total.toFixed(2)}</strong></div>
        </div>
        <div class="total-row">
          <div><strong>TOTAL:</strong></div>
          <div><strong>$${receiptData.total.toFixed(2)}</strong></div>
        </div>
        <div class="total-row">
          <div><strong>PAIEMENT:</strong></div>
          <div class="payment-method"><strong>${receiptData.paymentMethod.toUpperCase()}</strong></div>
        </div>
      </div>
      
      <div class="sales-person">
        Agent: <strong>${receiptData.salesPerson.toUpperCase()}</strong>
      </div>
      
      <div class="footer">
        <div class="thank-you"><strong>MERCI POUR VOTRE ACHAT !</strong></div>
        <div class="warning"><strong>Article non echangeable</strong></div>
        <div class="warning"><strong>Non remboursable</strong></div>
        <div class="thank-you"><strong>A BIENTOT !</strong></div>
      </div>
      
      <!-- PAPER CUT INDICATOR -->
      <div class="cut-line">
        ✄ ────────────────────────── ✄
      </div>
    </div>
    <script>
      window.onload = function() {
        try {
          window.print();
        } catch(e) {
          console.error('Print error:', e);
        }
        setTimeout(() => {
          window.close();
        }, 1000);
      };
    </script>
  </body>
</html>
`);
      printWindow.document.close();
    }
  };

  // Print function for stub only
  const printStubOnly = () => {
    const printWindow = window.open("", "_blank", "width=320,height=600");
    if (printWindow) {
      printWindow.document.write(`
<html>
  <head>
    <title>Sale Stub</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body { 
        font-family: 'Courier New', Courier, monospace; 
        margin: 0; 
        padding: 0; 
        font-size: 13px;
        font-weight: bold;
        line-height: 1.1;
        width: 72mm;
        background-color: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        display: flex;
        justify-content: center;
      }
      .stub-container { 
        width: 70mm;
        margin: 0 auto;
        padding: 0.5mm;
        border: none;
        text-align: center;
      }
      .header { 
        text-align: center; 
        margin-bottom: 1mm; 
        padding-bottom: 1mm;
        border-bottom: 2px double #000;
      }
      .shop-name {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 0.5mm;
        text-transform: uppercase;
      }
      .shop-details {
        font-size: 11px;
        margin-bottom: 0.3mm;
        line-height: 1;
        font-weight: bold;
      }
      .receipt-info {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #f8f8f8;
        border-left: 3px solid #000;
      }
      .receipt-title {
        font-size: 13px;
        font-weight: bold;
        margin: 1mm 0;
        text-transform: uppercase;
        background-color: #000;
        color: white;
        padding: 1mm;
        border-radius: 2px;
      }
      .stub-number {
        font-size: 13px;
        font-weight: bold;
        margin: 1mm 0;
        text-transform: uppercase;
        background-color: #333;
        color: white;
        padding: 1mm 2mm;
        border-radius: 3px;
      }
      .items-section {
        margin: 1mm 0;
        padding: 1mm;
        background-color: #fafafa;
        border: 1px solid #eee;
      }
      .item-row { 
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5mm;
        padding: 0 1mm;
        border-bottom: 1px dotted #ddd;
      }
      .item-name {
        text-align: left;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .item-details {
        text-align: right;
        font-weight: bold;
        font-size: 12px;
        flex: 1;
      }
      .total-section { 
        font-weight: bold; 
        margin-top: 1mm;
        padding: 1mm;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.3mm;
        font-size: 13px;
        padding: 0 1mm;
      }
      .payment-method {
        text-transform: uppercase;
        font-weight: bold;
        font-size: 13px;
      }
      .stub-footer { 
        text-align: center; 
        margin-top: 1mm; 
        font-size: 11px;
        font-weight: bold;
        padding: 1mm;
        background-color: #e8e8e8;
        border: 1px solid #ccc;
        border-radius: 3px;
      }
      .sales-person {
        margin-top: 1mm;
        text-align: center;
        font-weight: bold;
        font-size: 12px;
        padding: 1mm;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 2px;
      }
      .customer-info {
        margin: 1mm 0;
        padding: 1mm;
        font-weight: bold;
        text-align: center;
        background-color: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      .customer-field {
        margin-bottom: 0.3mm;
        font-size: 12px;
      }
      .separator {
        border-top: 1px dashed #000;
        margin: 1mm 0;
      }
      .cut-line {
        text-align: center;
        margin: 1mm 0;
        font-weight: bold;
        font-size: 11px;
        color: #000;
        letter-spacing: 1px;
      }
      .thank-you {
        font-weight: bold;
        margin: 0.5mm 0;
        font-size: 12px;
      }
      .warning {
        font-size: 10px;
        color: #000;
        margin: 0.3mm 0;
        font-weight: bold;
      }
      .section-divider {
        height: 2px;
        background: linear-gradient(to right, transparent, #000, transparent);
        margin: 1mm 0;
      }
      @media print {
        @page {
          margin: 0 !important;
          size: 72mm auto !important;
        }
        body { 
          margin: 0 !important; 
          padding: 0 !important; 
          width: 72mm !important;
          font-size: 13px !important;
          background: white !important;
          font-weight: bold !important;
          height: auto !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          display: flex !important;
          justify-content: center !important;
        }
        .stub-container { 
          border: none !important; 
          box-shadow: none !important; 
          margin: 0 auto !important;
          padding: 0.5mm !important;
          width: 70mm !important;
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
        }
        .cut-line {
          page-break-after: always !important;
          margin-bottom: 0 !important;
        }
        body::after,
        body::before {
          display: none !important;
          content: none !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="stub-container">
      <div class="header">
        <div class="shop-name"><strong>${receiptData.shopName}</strong></div>
        <div class="shop-details"><strong>${receiptData.shopAddress}</strong></div>
        <div class="shop-details">TEL: <strong>${receiptData.shopNumber}</strong></div>
      </div>
      
      <div class="section-divider"></div>
      
      <div class="receipt-info">
        <div class="shop-details">DATE: <strong>${receiptData.date}</strong></div>
        <div class="shop-details">RECU #: <strong>${receiptData.receiptNumber}</strong></div>
      </div>
      
      <div class="stub-number">
        SOUCHE N°<strong>${receiptData.stubNumber}</strong>
      </div>
      
      <div class="customer-info">
        <div class="customer-field">CLIENT: <strong>${receiptData.customerName.toUpperCase()}</strong></div>
        <div class="customer-field">TELEPHONE: <strong>${receiptData.customerPhone}</strong></div>
      </div>
      
      <div class="receipt-title">ARTICLES VENDUS</div>
      
      <div class="items-section">
      ${receiptData.items
        .map(
          (item: CartItem) => `
        <div class="item-row">
          <div class="item-name"><strong>${item.name}</strong></div>
          <div class="item-details">
            <strong>${formatSaleQuantity(item)} X $${item.unitPrice.toFixed(2)}</strong>
          </div>
        </div>
      `
        )
        .join("")}
      </div>
      
      <div class="total-section">
        <div class="total-row">
          <div><strong>TOTAL VENTE:</strong></div>
          <div><strong>$${receiptData.total.toFixed(2)}</strong></div>
        </div>
        <div class="total-row">
          <div><strong>PAIEMENT:</strong></div>
          <div class="payment-method"><strong>${receiptData.paymentMethod.toUpperCase()}</strong></div>
        </div>
      </div>
      
      <div class="sales-person">
        Agent: <strong>${receiptData.salesPerson.toUpperCase()}</strong>
      </div>
      
      <div class="stub-footer">
        <div class="thank-you"><strong>SOUCHE DE CAISSE</strong></div>
        <div class="warning"><strong>${receiptData.shopName}</strong></div>
        <div class="warning"><strong>Conserver cette souche</strong></div>
        <div class="warning">Recu #: <strong>${receiptData.receiptNumber}</strong></div>
        <div class="warning">Date: <strong>${receiptData.date}</strong></div>
      </div>
      
      <!-- PAPER CUT INDICATOR -->
      <div class="cut-line">
        ✄ ────────────────────────── ✄
      </div>
    </div>
    <script>
      window.onload = function() {
        try {
          window.print();
        } catch(e) {
          console.error('Print error:', e);
        }
        setTimeout(() => {
          window.close();
        }, 1000);
      };
    </script>
  </body>
</html>
`);
      printWindow.document.close();
    }
  };

  // Sequential printing function
  const printSequentially = () => {
    // Print receipt first
    printReceiptOnly();

    // Wait 2 seconds then print stub
    setTimeout(() => {
      printStubOnly();
    }, 2000);
  };

  // ESC/POS printing function
  const printWithESCPOS = async (receiptData: any) => {
    try {
      console.log("Attempting ESC/POS printing...");
      // Print receipt
      await PrintService.printReceipt(receiptData, "sale");
      // Print stub
      await PrintService.printStub(receiptData, "sale");
      console.log("ESC/POS printing successful");
      return true;
    } catch (error: any) {
      console.error(
        "ESC/POS printing failed, falling back to browser printing:",
        error
      );
      // Fallback to sequential browser printing
      printSequentially();
      return false;
    }
  };

  useEffect(() => {
    if (receiptData) {
      // Small delay to ensure the receipt data is set
      const timer = setTimeout(async () => {
        try {
          // Try ESC/POS printing first, fallback to sequential browser printing
          await printWithESCPOS(receiptData);
        } catch (error) {
          console.error("Printing failed:", error);
          // Last resort: try sequential browser printing directly
          printSequentially();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [receiptData]);

  async function handleSale(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      // Get token directly from localStorage
      const token = localStorage.getItem("token");
      
      // Check if token exists
      if (!token) {
        setError("Session expirée. Veuillez vous reconnecter.");
        setSubmitting(false);
        return;
      }

      const body = {
        customer: {
          name: form.customerName,
          phone: form.customerPhone,
          email: form.customerEmail || "",
        },
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          paidQuantity: item.paidQuantity,
          bonusQuantity: item.bonusQuantity,
          piecesPerCarton: item.piecesPerCarton,
          cartonQuantity: Math.floor(item.paidQuantity / item.piecesPerCarton),
          looseQuantity: item.paidQuantity % item.piecesPerCarton,
          bonusCartons: Math.floor(item.bonusQuantity / item.piecesPerCarton),
          bonusPieces: item.bonusQuantity % item.piecesPerCarton,
          price: item.unitPrice,
        })),
        subtotal: cartTotal,
        total: cartTotal,
        paymentMethod: uiToModelPayment(form.paymentMethod),
        salesPerson: currentUser?.username || "unknown",
      };

      const res = await fetch(`${API_BASE}/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body),
      });

      const data = await readJsonSafe(res);
      
      if (!res.ok) {
        // If 401, token might be invalid or expired
        if (res.status === 401) {
          // Clear invalid token
          localStorage.removeItem("token");
          setError("Session expirée. Veuillez vous reconnecter.");
          setSubmitting(false);
          return;
        }
        
        const msg =
          (data as any)?.error ||
          (data as any)?.text ||
          `Sale failed (${res.status})`;
        throw new Error(msg);
      }

      // Get the sale ID from the API response
      const saleId = data.saleId || data._id;
      
      // Enhanced receipt data with better formatting - use actual sale ID
      const newReceiptData = {
        shopName: "Lulu Fashion",
        shopAddress: "Av Mitwaba Rue Musoshi N°51, C. Kenya, Lubumbashi",
        shopNumber: "+243 991 924 151 / +243 995 797 399",
        shopRegistration: "LSH-RCCM-23-A-00842",
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        items: cart,
        total: cartTotal,
        paymentMethod: form.paymentMethod,
        salesPerson: currentUser?.username || "Agent",
        date: formatGmt2DateTime(new Date()),
        receiptNumber: saleId, // Use actual sale ID from API
        stubNumber: saleId, // Use actual sale ID from API for stub as well
      };

      setReceiptData(newReceiptData);

      setProducts((prevProducts) =>
        prevProducts.map((p) => {
          const soldQuantity = cart
            .filter((item) => item.productId === p._id)
            .reduce((sum, item) => sum + item.quantity, 0);
          return soldQuantity > 0
            ? { ...p, stock: Math.max(0, p.stock - soldQuantity) }
            : p;
        })
      );

      // Reset form and cart
      setForm({
        productId: "",
        quantity: "",
        cartonQuantity: "",
        looseQuantity: "",
        bonusCartons: "",
        bonusPieces: "",
        unitPrice: "",
        priceInFC: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        paymentMethod: form.paymentMethod,
        currencyMode: "usd"
      });
      setCart([]);
      setSearchTerm("");

      setMessage(
        "✅ Vente effectuée avec succès ! Impression du reçu et de la souche..."
      );
    } catch (e: any) {
      setError(e?.message || "La vente n'a pas pu être effectuée");
    } finally {
      setSubmitting(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatFc = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FC';
  };

  // Check if the product can be added to cart (comprehensive validation)
  const canAddToCart =
    product &&
    quantity > 0 &&
    (paidQuantity === 0 || unitPrice > 0) &&
    checkStockAfterAdd(product._id, quantity);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Exchange Rate */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-7 h-7 text-blue-400" />
                Nouvelle Vente
              </h2>
              <p className="text-blue-200/70 mt-1">
                Créez une nouvelle vente avec gestion multi-devises
              </p>
            </div>
            
            {/* Exchange Rate Display */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-950 border border-blue-700/50 rounded-xl p-4 min-w-[280px] shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-blue-200">Taux du jour:</span>
                </div>
                {loadingRate ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                ) : exchangeRate ? (
                  <div className="text-right">
                    <div className="font-bold text-white text-lg">
                      1 USD = {new Intl.NumberFormat('fr-FR').format(exchangeRate.rate)} FC
                    </div>
                    <div className="text-xs text-blue-300/70">
                      Effectif depuis {formatGmt2Date(exchangeRate.effectiveFrom)}
                    </div>
                  </div>
                ) : (
                  <span className="text-red-400 text-sm">Taux non disponible</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700/50 text-green-300 rounded-xl">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700/50 text-red-300 rounded-xl">
            {error}
          </div>
        )}

        {/* Add Items Section */}
        <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl p-6 border border-blue-800/50">
          <h3 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
            <Package className="w-5 h-5" />
            Ajouter les articles
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative" ref={searchRef}>
              <label className="block mb-2 font-medium text-blue-200">Articles</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowSearchResults(true)}
                  placeholder="Rechercher un article..."
                  className="w-full p-3 pl-10 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                  disabled={loadingProducts || products.length === 0}
                />
              </div>
              
              {/* Search Results Dropdown */}
              {showSearchResults && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gradient-to-br from-gray-900 to-blue-950 border border-blue-800/50 rounded-lg shadow-xl max-h-60 overflow-auto">
                  {filteredProducts.map((product) => (
                    <div
                      key={product._id}
                      className="px-4 py-3 cursor-pointer hover:bg-blue-900/30 border-b border-blue-800/30 last:border-b-0"
                      onClick={() => handleProductSelect(product)}
                    >
                      <div className="font-medium text-white">{product.name}</div>
                      <div className="text-sm text-blue-300 flex justify-between">
                        <span>{product.sku && `SKU: ${product.sku}`}</span>
                        <span className={
                          product.stock === 0 
                            ? "text-red-400" 
                            : product.stock <= 5 
                            ? "text-orange-400" 
                            : "text-green-400"
                        }>
                          {renderStockInfo(product)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* No Results Message */}
              {showSearchResults && searchTerm && filteredProducts.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gradient-to-br from-gray-900 to-blue-950 border border-blue-800/50 rounded-lg shadow-xl p-4 text-center text-blue-300">
                  Aucun article trouvé
                </div>
              )}
            </div>

            <div>
              <label className="block mb-2 font-medium text-blue-200">
                Boites vendues
              </label>
              <input
                type="number"
                name="cartonQuantity"
                value={form.cartonQuantity}
                onChange={handleChange}
                placeholder="0"
                className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                min={0}
              />
              <p className="mt-1 text-xs text-blue-300/70">
                {product
                  ? `1 boite = ${piecesPerCarton} piece${piecesPerCarton > 1 ? "s" : ""}`
                  : "Selectionnez un article."}
              </p>
            </div>

            <div>
              <label className="block mb-2 font-medium text-blue-200">Pieces hors boite</label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="0"
                className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                min={0}
                max={Math.max(0, piecesPerCarton - 1)}
              />
              {product && quantity > 0 && (
                <p className="mt-1 text-xs text-green-400">
                  Total: {formatCartonStock(quantity, piecesPerCarton)}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-medium text-blue-200">Prix par boite</label>
                <button
                  type="button"
                  onClick={toggleCurrencyMode}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-900/30 hover:bg-blue-800/50 text-blue-300 rounded-md transition-colors border border-blue-800/30"
                >
                  <Calculator className="w-3 h-3" />
                  {form.currencyMode === 'usd' ? 'USD → FC' : 'FC → USD'}
                </button>
              </div>
              
              {form.currencyMode === 'usd' ? (
                <input
                  type="number"
                  step="0.01"
                  name="unitPrice"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  placeholder={product?.price ? `ex: ${product.price}` : "Entrer le prix en USD"}
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                  min={0.01}
                />
              ) : (
                <input
                  type="number"
                  name="priceInFC"
                  value={form.priceInFC}
                  onChange={(e) => setForm({ ...form, priceInFC: e.target.value })}
                  placeholder="Entrer le prix en FC"
                  className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                  min={1}
                />
              )}
              
              {/* Conversion Display */}
              {form.unitPrice && form.currencyMode === 'usd' && exchangeRate && (
                <p className="text-xs text-green-400 mt-1">
                  ≈ {formatFc(parseFloat(form.unitPrice) * exchangeRate.rate)}
                </p>
              )}
              {form.priceInFC && form.currencyMode === 'fc' && exchangeRate && (
                <p className="text-xs text-green-400 mt-1">
                  ≈ {formatCurrency(parseFloat(form.priceInFC) / exchangeRate.rate)}
                </p>
              )}
            </div>
          </div>

          {product && (
            <div className="mb-6 rounded-lg border border-blue-800/40 bg-black/25 p-4">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-300">
                Bonus offert
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block mb-2 font-medium text-blue-200">
                    Boites bonus
                  </label>
                  <input
                    type="number"
                    name="bonusCartons"
                    value={form.bonusCartons}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-blue-200">
                    Pieces bonus
                  </label>
                  <input
                    type="number"
                    name="bonusPieces"
                    value={form.bonusPieces}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                    min={0}
                    max={Math.max(0, piecesPerCarton - 1)}
                  />
                  <p className="mt-1 text-xs text-blue-300/70">
                    Pour une demi-boite, entrez la moitie des pieces.
                  </p>
                </div>
                <div className="rounded-lg border border-blue-800/30 bg-blue-950/30 p-3 text-sm text-blue-200">
                  <div className="flex justify-between gap-3">
                    <span>Vendu:</span>
                    <strong className="text-white">
                      {formatCartonStock(paidQuantity, piecesPerCarton)}
                    </strong>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span>Bonus:</span>
                    <strong className="text-white">
                      {formatCartonStock(bonusQuantity, piecesPerCarton)}
                    </strong>
                  </div>
                  <div className="mt-2 flex justify-between gap-3 border-t border-blue-800/30 pt-2">
                    <span>Facture:</span>
                    <strong className="text-green-300">{formatCurrency(itemTotal)}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {product && renderAvailableStockMessage(product, quantity)}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all duration-200 ${
              canAddToCart
                ? "bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white shadow-lg shadow-blue-900/50 border border-blue-400/30"
                : "bg-gray-800 cursor-not-allowed text-gray-500 border border-gray-700"
            }`}
          >
            <Plus className="w-4 h-4" />
            Ajouter au panier
          </button>

          {/* Cart Items Table */}
          {cart.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Articles du panier
              </h3>
              <div className="overflow-x-auto rounded-lg border border-blue-800/50">
                <table className="w-full">
                  <thead className="bg-black/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-blue-300">Articles</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-blue-300">Pièces</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-blue-300">Prix boite</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-blue-300">Total</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-blue-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800/30">
                    {cart.map((item, index) => (
                      <tr key={index} className="hover:bg-blue-900/20">
                        <td className="px-4 py-3 text-sm text-white">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-center text-blue-300">
                          {formatSaleQuantity(item)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-white">
                          {formatCurrency(item.unitPrice)}
                          {exchangeRate && (
                            <div className="text-xs text-blue-300">
                              ≈ {formatFc(item.unitPrice * exchangeRate.rate)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-white font-medium">
                          {formatCurrency(item.total)}
                          {exchangeRate && (
                            <div className="text-xs text-blue-300">
                              ≈ {formatFc(item.total * exchangeRate.rate)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeFromCart(index)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex items-center gap-1 justify-center mx-auto"
                          >
                            <Trash2 className="w-4 h-4" />
                            Enlever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-black/30">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-blue-300">
                        Total:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                        {formatCurrency(cartTotal)}
                        {exchangeRate && (
                          <div className="text-xs text-blue-300">
                            ≈ {formatFc(cartTotal * exchangeRate.rate)}
                          </div>
                        )}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Customer Information Section */}
        <div className="bg-gradient-to-br from-gray-900 to-blue-950 shadow-xl rounded-xl p-6 border border-blue-800/50">
          <h3 className="text-lg font-semibold mb-4 text-blue-400 flex items-center gap-2 border-b border-blue-800/50 pb-3">
            <User className="w-5 h-5" />
            Informations du client
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block mb-2 font-medium text-blue-200">
                <User className="w-4 h-4 inline mr-1" />
                Nom du client *
              </label>
              <input
                type="text"
                name="customerName"
                value={form.customerName}
                onChange={handleChange}
                placeholder="Entrer le nom du client"
                className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-blue-200">
                <Phone className="w-4 h-4 inline mr-1" />
                Numéro de téléphone du client *
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="Entrer le numéro de téléphone"
                className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
                required
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-blue-200">
                <Mail className="w-4 h-4 inline mr-1" />
                Email du client (optionnel)
              </label>
              <input
                type="email"
                name="customerEmail"
                value={form.customerEmail}
                onChange={handleChange}
                placeholder="Entrer l'email du client"
                className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-blue-300/50"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-blue-200">
                Méthode de paiement
              </label>
              <select
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={handleChange}
                className="w-full p-3 bg-black/50 border border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                required
              >
                <option value="cash" className="bg-gray-900">Cash</option>
                <option value="mpesa" className="bg-gray-900">M-Pesa ou Airtel Money (Transfert)</option>
                <option value="bank" className="bg-gray-900">Transfert Bank</option>
                <option value="card" className="bg-gray-900">Carte Visa</option>
                <option value="other" className="bg-gray-900">Autres</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            onClick={handleSale}
            disabled={!isFormValid || submitting}
            className={`w-full px-8 py-4 rounded-xl font-medium text-lg transition-all duration-200 ${
              isFormValid && !submitting
                ? "bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white shadow-lg shadow-green-900/50 border border-green-400/30"
                : "bg-gray-800 cursor-not-allowed text-gray-500 border border-gray-700"
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                En cours d'enregistrement...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Enregistrer la vente
              </span>
            )}
          </button>
        </div>

        {/* Hidden receipt container (keep as fallback) */}
        <div ref={receiptRef} style={{ display: "none" }} />
      </div>
    </div>
  );
}


