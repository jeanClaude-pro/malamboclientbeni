/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  ArrowUp,
  ArrowDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Calculator,
  Shield,
  FileText,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { WALK_IN_CUSTOMER_NAME } from "../utils/constants";
import { sidebarSections } from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";

// Define interfaces for the data structures
interface SaleItem {
  productId?: string;
  name?: string;
  quantity?: number;
  paidQuantity?: number;
  bonusQuantity?: number;
  cartonQuantity?: number;
  looseQuantity?: number;
  bonusCartons?: number;
  bonusPieces?: number;
  piecesPerCarton?: number;
  price?: number;
  total?: number;
}

interface Sale {
  _id?: string;
  total: number;
  status?: string;
  createdAt?: string;
  date?: string;
  saleDate?: string;
  items?: SaleItem[];
  customerId?: string;
  customerName?: string;
  type?: string;
  paymentType?: "cash" | "credit";
  saleId?: string;
  saleNumber?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

interface RevenueEvent {
  amount: number;
  receivedAt: string;
  kind: "cash_sale" | "credit_payment";
}

interface Customer {
  _id?: string;
  id?: string;
  name?: string;
  totalSpent?: number;
  totalPurchases?: number;
  email?: string;
}

interface ProductStock {
  _id: string;
  name: string;
  stock: number;
  piecesPerCarton?: number;
}

interface Expense {
  _id?: string;
  amount: number;
  status: string;
  createdAt?: string;
  date?: string;
  validatedAt?: string;
  reason?: string;
  expenseId?: string;
  recipientName?: string;
}

interface Entry {
  _id?: string;
  amount: number;
  status: string;
  createdAt?: string;
  date?: string;
  source?: string;
  category?: string;
  entryId?: string;
  receivedFrom?: {
    name?: string;
  };
}

interface AnalyticsData {
  totalSales: number;
  totalRevenue: number;
  totalCustomers: number;
  totalProducts: number;
  totalValidatedExpenses: number;
  totalEntries: number;
  netRevenue: number;
  salesByDay: {
    date: string;
    dayName: string;
    sales: number;
    revenue: number;
  }[];
  salesByWeek: {
    week: string;
    startDate: string;
    endDate: string;
    sales: number;
    revenue: number;
  }[];
  salesByMonth: {
    month: string;
    monthName: string;
    sales: number;
    revenue: number;
  }[];
  salesByYear: {
    year: string;
    months: {
      month: string;
      monthName: string;
      sales: number;
      revenue: number;
    }[];
  }[];
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
    paidQuantity: number;
    bonusQuantity: number;
    piecesPerCarton: number;
    normalCartons: number;
    normalPieces: number;
    bonusCartons: number;
    bonusPieces: number;
    remainingStock: number;
  }[];
  topCustomers: { name: string; purchases: number; totalSpent: number }[];
  recentTrends: {
    salesGrowth: number;
    revenueGrowth: number;
    customerGrowth: number;
  };
}

interface TimeframeData {
  description: string;
  start: string;
  end: string;
}

const serverUrl = import.meta.env.VITE_API_URL;

// Helper function to get today's date in correct format
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to get user role from localStorage
const getUserRole = (): string => {
  if (typeof window === "undefined") return "user";

  try {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      return user.role || "user";
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  return "user";
};

// Check if user is admin
const isAdmin = (): boolean => {
  return getUserRole() === "admin";
};

// Check if user should see only today's data (non-admin)
const shouldSeeOnlyTodayData = (): boolean => {
  return !isAdmin();
};

// Helper function to get headers
const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Helper function to get the number of pieces per carton, defaulting to 1
const getPiecesPerCarton = (value?: number): number => {
  return Math.max(1, Math.floor(Number(value || 1)));
};

// Helper function to format a piece count as cartons (and remaining pieces)
const formatCartonQuantity = (totalPieces: number, piecesPerCarton?: number): string => {
  const perCarton = getPiecesPerCarton(piecesPerCarton);
  const safeTotal = Math.max(0, Math.floor(Number(totalPieces || 0)));

  if (perCarton <= 1) {
    return `${safeTotal} pièce${safeTotal > 1 ? "s" : ""}`;
  }

  const cartons = Math.floor(safeTotal / perCarton);
  const pieces = safeTotal % perCarton;

  if (pieces === 0) {
    return `${cartons} carton${cartons > 1 ? "s" : ""}`;
  }
  return `${cartons} carton${cartons > 1 ? "s" : ""} et ${pieces} pièce${pieces > 1 ? "s" : ""}`;
};

const formatRecordedUnits = (cartons: number, pieces: number): string => {
  const parts: string[] = [];
  if (cartons > 0) parts.push(`${cartons} carton${cartons > 1 ? "s" : ""}`);
  if (pieces > 0) parts.push(`${pieces} pièce${pieces > 1 ? "s" : ""}`);
  return parts.length > 0 ? parts.join(" et ") : "0 produit";
};

// Helper function to get timeframe parameters based on selection
const getTimeframeParams = (
  timeframe: "day" | "week" | "month" | "year", 
  selectedYear?: number, 
  selectedDate?: string
) => {
  const params = new URLSearchParams();
  const today = new Date();
  
  switch (timeframe) {
    case "day":
      params.set("date", selectedDate || getTodayDate());
      break;
      
    case "week": {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.set("from", weekAgo.toISOString().split('T')[0]);
      params.set("to", today.toISOString().split('T')[0]);
      break;
    }
      
    case "month": {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      params.set("from", firstDayOfMonth.toISOString().split('T')[0]);
      params.set("to", lastDayOfMonth.toISOString().split('T')[0]);
      break;
    }
      
    case "year": {
      const year = selectedYear || today.getFullYear();
      params.set("year", year.toString());
      break;
    }
  }
  
  return params.toString();
};

export default function Analytics() {
  const { user, activeBranchId } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">(
    "day"
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [timeframeData, setTimeframeData] = useState<TimeframeData | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const isSuperAdmin = user?.role === "admin" || user?.role === "superadmin" || user?.isSuperAdmin;
  const accessibleModules = sidebarSections
    .flatMap((section) => section.items)
    .filter((item) => item.path !== "/")
    .filter((item) => {
      if (isSuperAdmin) return true;
      if (user?.role === "manager") return ["/reports", "/products", "/sortiehistory"].includes(item.path);
      return !item.roles || (!!user?.role && item.roles.includes(user.role));
    });
  const moduleDescriptions: Record<string, string> = {
    taux: "Mettre à jour le taux de change utilisé par l'entreprise",
    pos: "Enregistrer une vente ou une réservation",
    cars: "Planifier les camions et leurs chargements",
    entry: "Enregistrer les entrées de caisse",
    sortie: "Soumettre et suivre les sorties de caisse",
    transfert: "Préparer les transferts de marchandises",
    "transfer-reception": "Réceptionner les marchandises dans le stock",
    products: "Gérer les articles, le stock et les fiches d'audit",
    sales: "Consulter les ventes et les paiements",
    carshistory: "Contrôler les trajets, arrivées et corrections",
    entryhistory: "Consulter l'historique des entrées",
    historicsortie: "Consulter et valider les sorties",
    historictransfert: "Suivre les transferts enregistrés",
    historicreception: "Contrôler les réceptions de stock",
    reports: "Analyser les résultats et générer les rapports PDF",
    customers: "Retrouver les clients et leur historique",
    users: "Affecter le personnel aux agences de Butembo et de Beni",
  };

  // Effect to automatically set to today's date when timeframe changes to "day"
  useEffect(() => {
    if (!initialLoad && timeframe === "day") {
      const today = getTodayDate();
      setSelectedDate(today);
    }
  }, [timeframe, initialLoad]);

  // Effect to mark initial load as complete
  useEffect(() => {
    if (analytics) {
      setInitialLoad(false);
    }
  }, [analytics]);

  // Effect to enforce day-only view for non-admin users
  useEffect(() => {
    if (shouldSeeOnlyTodayData() && timeframe !== "day") {
      setTimeframe("day");
      setSelectedDate(getTodayDate());
    }
  }, [timeframe]);

  // Main effect to fetch data when timeframe changes
  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, selectedYear, selectedDate]);

  useEffect(() => {
    const handleDataChange = () => { void fetchAnalytics(); };
    window.addEventListener("appDataChanged", handleDataChange);
    return () => window.removeEventListener("appDataChanged", handleDataChange);
    // The handler reads the current timeframe state from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch analytics data with server-side timeframe filtering
  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // For non-admin users, only fetch today's data
      if (shouldSeeOnlyTodayData()) {
        await fetchTodayDataOnly();
        return;
      }

      // For admin, fetch data with timeframe filtering
      await fetchDataWithTimeframe();
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch only today's data for non-admin users
  const fetchTodayDataOnly = async () => {
    try {
      const today = getTodayDate();
      
      // Build query with today's date
      const timeframeParams = `date=${today}`;
      
      // Fetch sales, expenses, and entries for today
      const [salesResponse, expensesResponse, entriesResponse, productsResponse] = await Promise.all([
        fetch(`${serverUrl}/sales?${timeframeParams}`, {
          headers: getHeaders(),
        }),
        fetch(`${serverUrl}/expenses?${timeframeParams}`, {
          headers: getHeaders(),
        }),
        fetch(`${serverUrl}/entries?${timeframeParams}`, {
          headers: getHeaders(),
        }),
        fetch(`${serverUrl}/products`, { headers: getHeaders() })
      ]);

      if (!salesResponse.ok) {
        throw new Error(`Failed to fetch sales: ${salesResponse.status}`);
      }

      const salesData = await salesResponse.json();
      const expensesData = expensesResponse.ok ? await expensesResponse.json() : { data: [], summary: { totalAmount: 0 } };
      const entriesData = entriesResponse.ok ? await entriesResponse.json() : { data: [], summary: { totalAmount: 0 } };
      const productsData = productsResponse.ok ? await productsResponse.json() : [];

      // Process the data for today
      const processedAnalytics = processTodayData(
        salesData,
        expensesData,
        entriesData,
        Array.isArray(productsData) ? productsData : productsData.data || productsData.products || []
      );
      
      setAnalytics(processedAnalytics);
      setTimeframeData({ description: "Aujourd'hui", start: today, end: today });
      
    } catch (error) {
      console.error("Error fetching today's data:", error);
      throw error;
    }
  };

  // Fetch data with timeframe filtering for admin users
  const fetchDataWithTimeframe = async () => {
    try {
      // Build timeframe parameters
      const timeframeParams = getTimeframeParams(timeframe, selectedYear, selectedDate);
      
      // Fetch sales, expenses, and entries with timeframe filtering
      const [salesResponse, expensesResponse, entriesResponse, customersResponse, productsResponse] = await Promise.all([
        fetch(`${serverUrl}/sales?${timeframeParams}`, {
          headers: getHeaders(),
        }),
        fetch(`${serverUrl}/expenses?${timeframeParams}`, {
          headers: getHeaders(),
        }),
        fetch(`${serverUrl}/entries?${timeframeParams}`, {
          headers: getHeaders(),
        }),
        fetch(`${serverUrl}/customers?limit=0`, {
          headers: getHeaders(),
        }),
        fetch(`${serverUrl}/products`, { headers: getHeaders() })
      ]);

      if (!salesResponse.ok) {
        throw new Error(`Failed to fetch sales: ${salesResponse.status}`);
      }

      const salesData = await salesResponse.json();
      const expensesData = expensesResponse.ok ? await expensesResponse.json() : { data: [], summary: { totalAmount: 0 } };
      const entriesData = entriesResponse.ok ? await entriesResponse.json() : { data: [], summary: { totalAmount: 0 } };
      const customersData = customersResponse.ok ? await customersResponse.json() : [];
      const productsData = productsResponse.ok ? await productsResponse.json() : [];

      // Extract customers from response
      const customers = Array.isArray(customersData) 
        ? customersData 
        : customersData.data || customersData.customers || [];

      // Process the data with timeframe
      const processedAnalytics = processAnalyticsData(
        salesData,
        expensesData,
        entriesData,
        customers,
        Array.isArray(productsData) ? productsData : productsData.data || productsData.products || []
      );
      
      setAnalytics(processedAnalytics);
      setTimeframeData(salesData.timeframe);
      
      // Extract available years for year selection
      if (salesData.timeframe) {
        const years = extractAvailableYears();
        setAvailableYears(years);
        if (years.length > 0 && !years.includes(selectedYear)) {
          setSelectedYear(years[0]);
        }
      }
      
    } catch (error) {
      console.error("Error fetching analytics with timeframe:", error);
      throw error;
    }
  };

  // Process today's data for non-admin users
  const processTodayData = (
    salesData: any,
    expensesData: any,
    entriesData: any,
    products: ProductStock[]
  ): AnalyticsData => {
    const sales = salesData.data || [];
    const expenses = expensesData.data || [];
    const entries = entriesData.data || [];

    // Filter completed sales only (not voided, not corrected, not expense type)
    const completedSales = sales.filter((sale: Sale) => 
      sale.status !== "voided" && 
      sale.status !== "refunded" && 
      sale.status !== "corrected" &&
      sale.type !== "expense" &&
      (sale.status === "completed" || sale.status === "pending")
    );

    const totalSales = completedSales.length;
    const totalRevenue = salesData.summary?.revenue != null
      ? Number(salesData.summary.revenue)
      : completedSales
          .filter((sale: Sale) => sale.paymentType !== "credit")
          .reduce((sum: number, sale: Sale) => sum + sale.total, 0);
    
    // Calculate entries (active entries only)
    const activeEntries = entries.filter((entry: Entry) => entry.status === "active");
    const totalEntries = activeEntries.reduce((sum: number, entry: Entry) => sum + entry.amount, 0);
    
    // Calculate validated expenses
    const validatedExpenses = expenses.filter((expense: Expense) => expense.status === "validated");
    const totalValidatedExpenses = validatedExpenses.reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
    
    // Calculate net revenue
    const netRevenue = (totalRevenue + totalEntries) - totalValidatedExpenses;

    // Count unique products
    const productIds = new Set();
    completedSales.forEach((sale: Sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: SaleItem) => {
          if (item.productId) {
            productIds.add(item.productId);
          }
        });
      }
    });
    const totalProducts = productIds.size;

    // Count unique customers
    const customerIds = new Set();
    completedSales.forEach((sale: Sale) => {
      if (sale.customerId) {
        customerIds.add(sale.customerId);
      } else if (sale.customer?.phone) {
        customerIds.add(sale.customer.phone);
      }
    });
    const totalCustomers = customerIds.size;

    // Today's chart data
    const today = new Date();
    const salesByDay = [
      {
        date: today.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
        }),
        dayName: today.toLocaleDateString("fr-FR", { weekday: "long" }),
        sales: totalSales,
        revenue: totalRevenue,
      },
    ];

    // Top products from today's sales
    const productStats = new Map();
    completedSales.forEach((sale: Sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: SaleItem) => {
          const productName = item.name || "Unknown Product";
          const bonusQuantity = item.bonusQuantity || 0;
          const paidQuantity = item.paidQuantity ?? Math.max(0, (item.quantity || 0) - bonusQuantity);
          const piecesPerCarton = getPiecesPerCarton(item.piecesPerCarton);
          const product = products.find((candidate) =>
            candidate._id === String(item.productId || "") || candidate.name === productName
          );
          const normalCartons = item.cartonQuantity ?? Math.floor(paidQuantity / piecesPerCarton);
          const normalPieces = item.looseQuantity ?? paidQuantity % piecesPerCarton;
          const bonusCartons = item.bonusCartons ?? Math.floor(bonusQuantity / piecesPerCarton);
          const bonusPieces = item.bonusPieces ?? bonusQuantity % piecesPerCarton;
          if (productStats.has(productName)) {
            const existing = productStats.get(productName);
            productStats.set(productName, {
              quantity: existing.quantity + (item.quantity || 0),
              revenue: existing.revenue + (sale.paymentType === "credit" ? 0 : (item.total || 0)),
              paidQuantity: existing.paidQuantity + paidQuantity,
              bonusQuantity: existing.bonusQuantity + bonusQuantity,
              piecesPerCarton: existing.piecesPerCarton || piecesPerCarton,
              normalCartons: existing.normalCartons + normalCartons,
              normalPieces: existing.normalPieces + normalPieces,
              bonusCartons: existing.bonusCartons + bonusCartons,
              bonusPieces: existing.bonusPieces + bonusPieces,
              remainingStock: product?.stock ?? existing.remainingStock,
            });
          } else {
            productStats.set(productName, {
              quantity: item.quantity || 0,
              revenue: sale.paymentType === "credit" ? 0 : (item.total || 0),
              paidQuantity,
              bonusQuantity,
              piecesPerCarton,
              normalCartons,
              normalPieces,
              bonusCartons,
              bonusPieces,
              remainingStock: product?.stock ?? 0,
            });
          }
        });
      }
    });

    const topProducts = Array.from(productStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.paidQuantity - a.paidQuantity);

    // Top customers from today's sales
    const customerStats = new Map();
    completedSales.forEach((sale: Sale) => {
      const customerName = sale.customer?.name || sale.customerName || WALK_IN_CUSTOMER_NAME;
      const key = customerName;
      
      if (customerStats.has(key)) {
        const existing = customerStats.get(key);
        customerStats.set(key, {
          name: customerName,
          purchases: existing.purchases + 1,
          totalSpent: existing.totalSpent + sale.total,
        });
      } else {
        customerStats.set(key, {
          name: customerName,
          purchases: 1,
          totalSpent: sale.total,
        });
      }
    });

    const topCustomers = Array.from(customerStats.values())
      .filter(customer => customer.purchases > 0 && customer.name !== WALK_IN_CUSTOMER_NAME)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Simple growth trends (0 for today view)
    const recentTrends = {
      salesGrowth: 0,
      revenueGrowth: 0,
      customerGrowth: 0,
    };

    return {
      totalSales,
      totalRevenue,
      totalCustomers,
      totalProducts,
      totalValidatedExpenses,
      totalEntries,
      netRevenue,
      salesByDay,
      salesByWeek: [],
      salesByMonth: [],
      salesByYear: [],
      topProducts,
      topCustomers,
      recentTrends,
    };
  };

  // Process analytics data with timeframe for admin users
  const processAnalyticsData = (
    salesData: any,
    expensesData: any,
    entriesData: any,
    customers: Customer[],
    products: ProductStock[]
  ): AnalyticsData => {
    const sales = salesData.data || [];
    const expensesSummary = expensesData.summary || { totalAmount: 0 };
    const entriesSummary = entriesData.summary || { totalAmount: 0 };

    // Filter completed sales
    const completedSales = sales.filter((sale: Sale) => 
      sale.status !== "voided" && 
      sale.status !== "refunded" && 
      sale.status !== "corrected" &&
      sale.type !== "expense" &&
      (sale.status === "completed" || sale.status === "pending")
    );

    const totalSales = completedSales.length;
    const totalRevenue = salesData.summary?.revenue != null
      ? Number(salesData.summary.revenue)
      : completedSales
          .filter((sale: Sale) => sale.paymentType !== "credit")
          .reduce((sum: number, sale: Sale) => sum + sale.total, 0);
    const totalEntries = entriesSummary.totalAmount || 0;
    const totalValidatedExpenses = expensesSummary.totalAmount || 0;
    const netRevenue = (totalRevenue + totalEntries) - totalValidatedExpenses;

    // Count unique products
    const productIds = new Set();
    completedSales.forEach((sale: Sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: SaleItem) => {
          if (item.productId) {
            productIds.add(item.productId);
          }
        });
      }
    });
    const totalProducts = productIds.size;

    // Count unique customers
    const customerIds = new Set();
    completedSales.forEach((sale: Sale) => {
      if (sale.customerId) {
        customerIds.add(sale.customerId);
      } else if (sale.customer?.phone) {
        customerIds.add(sale.customer.phone);
      }
    });
    const totalCustomers = customerIds.size;

    // Generate chart data based on timeframe
    const chartData = generateChartData(
      completedSales,
      Array.isArray(salesData.revenueEvents) ? salesData.revenueEvents : []
    );

    // Top products
    const productStats = new Map();
    completedSales.forEach((sale: Sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item: SaleItem) => {
          const productName = item.name || "Unknown Product";
          const bonusQuantity = item.bonusQuantity || 0;
          const paidQuantity = item.paidQuantity ?? Math.max(0, (item.quantity || 0) - bonusQuantity);
          const piecesPerCarton = getPiecesPerCarton(item.piecesPerCarton);
          const product = products.find((candidate) =>
            candidate._id === String(item.productId || "") || candidate.name === productName
          );
          const normalCartons = item.cartonQuantity ?? Math.floor(paidQuantity / piecesPerCarton);
          const normalPieces = item.looseQuantity ?? paidQuantity % piecesPerCarton;
          const bonusCartons = item.bonusCartons ?? Math.floor(bonusQuantity / piecesPerCarton);
          const bonusPieces = item.bonusPieces ?? bonusQuantity % piecesPerCarton;
          if (productStats.has(productName)) {
            const existing = productStats.get(productName);
            productStats.set(productName, {
              quantity: existing.quantity + (item.quantity || 0),
              revenue: existing.revenue + (sale.paymentType === "credit" ? 0 : (item.total || 0)),
              paidQuantity: existing.paidQuantity + paidQuantity,
              bonusQuantity: existing.bonusQuantity + bonusQuantity,
              piecesPerCarton: existing.piecesPerCarton || piecesPerCarton,
              normalCartons: existing.normalCartons + normalCartons,
              normalPieces: existing.normalPieces + normalPieces,
              bonusCartons: existing.bonusCartons + bonusCartons,
              bonusPieces: existing.bonusPieces + bonusPieces,
              remainingStock: product?.stock ?? existing.remainingStock,
            });
          } else {
            productStats.set(productName, {
              quantity: item.quantity || 0,
              revenue: sale.paymentType === "credit" ? 0 : (item.total || 0),
              paidQuantity,
              bonusQuantity,
              piecesPerCarton,
              normalCartons,
              normalPieces,
              bonusCartons,
              bonusPieces,
              remainingStock: product?.stock ?? 0,
            });
          }
        });
      }
    });

    const topProducts = Array.from(productStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.paidQuantity - a.paidQuantity);

    // Top customers
    const customerStats = new Map();
    completedSales.forEach((sale: Sale) => {
      const customerName = sale.customer?.name || sale.customerName || WALK_IN_CUSTOMER_NAME;
      const key = customerName;
      
      if (customerStats.has(key)) {
        const existing = customerStats.get(key);
        customerStats.set(key, {
          name: customerName,
          purchases: existing.purchases + 1,
          totalSpent: existing.totalSpent + sale.total,
        });
      } else {
        customerStats.set(key, {
          name: customerName,
          purchases: 1,
          totalSpent: sale.total,
        });
      }
    });

    // Also include customers from the customers list
    customers.forEach((customer: Customer) => {
      const key = customer.name || `Customer ${customer._id?.substring(0, 8)}...`;
      if (!customerStats.has(key) && customer.totalSpent && customer.totalSpent > 0) {
        customerStats.set(key, {
          name: customer.name || `Customer ${customer._id?.substring(0, 8)}...`,
          purchases: customer.totalPurchases || 0,
          totalSpent: customer.totalSpent || 0,
        });
      }
    });

    const topCustomers = Array.from(customerStats.values())
      .filter(customer => customer.purchases > 0 && customer.name !== WALK_IN_CUSTOMER_NAME)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Calculate growth trends
    const recentTrends = calculateGrowthTrends(completedSales, chartData);

    return {
      totalSales,
      totalRevenue,
      totalCustomers,
      totalProducts,
      totalValidatedExpenses,
      totalEntries,
      netRevenue,
      ...chartData,
      topProducts,
      topCustomers,
      recentTrends,
    };
  };

  // Generate chart data based on timeframe
  const generateChartData = (sales: Sale[], revenueEvents: RevenueEvent[]) => {
    if (!sales.length && !revenueEvents.length) {
      return {
        salesByDay: [],
        salesByWeek: [],
        salesByMonth: [],
        salesByYear: [],
      };
    }

    const now = new Date();
    
    // For day view - last 7 days
    const salesByDay = getLast7Days().map((date: Date) => {
      const daySales = sales.filter((sale: Sale) => {
        try {
          const saleDate = new Date(sale.createdAt || sale.date || sale.saleDate || "");
          return saleDate.toDateString() === date.toDateString();
        } catch {
          return false;
        }
      });
      const dayRevenue = revenueEvents
        .filter((event) => new Date(event.receivedAt).toDateString() === date.toDateString())
        .reduce((sum, event) => sum + Number(event.amount || 0), 0);
      return {
        date: date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
        dayName: date.toLocaleDateString("fr-FR", { weekday: "long" }),
        sales: daySales.length,
        revenue: dayRevenue,
      };
    });

    // For week view - last 4 weeks
    const salesByWeek = getLast4Weeks().map((week: { start: Date; end: Date }, index: number) => {
      const weekSales = sales.filter((sale: Sale) => {
        try {
          const saleDate = new Date(sale.createdAt || sale.date || sale.saleDate || "");
          return saleDate >= week.start && saleDate <= week.end;
        } catch {
          return false;
        }
      });
      const weekRevenue = revenueEvents
        .filter((event) => {
          const receivedAt = new Date(event.receivedAt);
          return receivedAt >= week.start && receivedAt <= week.end;
        })
        .reduce((sum, event) => sum + Number(event.amount || 0), 0);

      const startDateStr = week.start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      const endDateStr = week.end.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

      return {
        week: `Semaine ${index + 1}`,
        startDate: startDateStr,
        endDate: endDateStr,
        sales: weekSales.length,
        revenue: weekRevenue,
      };
    });

    // For month view - last 6 months
    const salesByMonth = getLast6Months().map((month: any) => {
      const monthSales = sales.filter((sale: Sale) => {
        try {
          const saleDate = new Date(sale.createdAt || sale.date || sale.saleDate || "");
          return saleDate.getMonth() === month.month && saleDate.getFullYear() === month.year;
        } catch {
          return false;
        }
      });
      const monthRevenue = revenueEvents
        .filter((event) => {
          const receivedAt = new Date(event.receivedAt);
          return receivedAt.getMonth() === month.month && receivedAt.getFullYear() === month.year;
        })
        .reduce((sum, event) => sum + Number(event.amount || 0), 0);
      return {
        month: month.shortName,
        monthName: month.fullName,
        sales: monthSales.length,
        revenue: monthRevenue,
      };
    });

    // For year view - group by month for selected year
    const currentYear = selectedYear || now.getFullYear();
    const yearSales = sales.filter((sale: Sale) => {
      try {
        const saleDate = new Date(sale.createdAt || sale.date || sale.saleDate || "");
        return saleDate.getFullYear() === currentYear;
      } catch {
        return false;
      }
    });

    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const monthSales = yearSales.filter((sale: Sale) => {
        try {
          const saleDate = new Date(sale.createdAt || sale.date || sale.saleDate || "");
          return saleDate.getMonth() === i;
        } catch {
          return false;
        }
      });
      const monthRevenue = revenueEvents
        .filter((event) => {
          const receivedAt = new Date(event.receivedAt);
          return receivedAt.getFullYear() === currentYear && receivedAt.getMonth() === i;
        })
        .reduce((sum, event) => sum + Number(event.amount || 0), 0);
      
      const monthDate = new Date(currentYear, i, 1);
      return {
        month: String(i),
        monthName: monthDate.toLocaleDateString("fr-FR", { month: "long" }),
        sales: monthSales.length,
        revenue: monthRevenue,
      };
    }).filter(month => month.sales > 0 || month.revenue > 0);

    const salesByYear = [{
      year: currentYear.toString(),
      months: monthsData,
    }];

    return {
      salesByDay,
      salesByWeek,
      salesByMonth,
      salesByYear,
    };
  };

  // Helper functions for chart data
  const getLast7Days = (): Date[] => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const getLast4Weeks = (): { start: Date; end: Date }[] => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const end = new Date();
      end.setDate(end.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      weeks.push({ start, end });
    }
    return weeks;
  };

  const getLast6Months = (): any[] => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        shortName: date.toLocaleDateString("fr-FR", { month: "short" }),
        fullName: date.toLocaleDateString("fr-FR", { month: "long" }),
      });
    }
    return months;
  };

  // Calculate growth trends
  const calculateGrowthTrends = (sales: Sale[], chartData: any) => {
    const salesByMonth = chartData.salesByMonth || [];
    
    if (salesByMonth.length < 2) {
      return {
        salesGrowth: sales.length > 0 ? 5 : 0,
        revenueGrowth: sales.length > 0 ? 8 : 0,
        customerGrowth: sales.length > 0 ? 3 : 0,
      };
    }

    const currentMonth = salesByMonth[salesByMonth.length - 1];
    const previousMonth = salesByMonth[salesByMonth.length - 2];

    const salesGrowth = previousMonth.sales > 0 
      ? Math.round(((currentMonth.sales - previousMonth.sales) / previousMonth.sales) * 100)
      : currentMonth.sales > 0 ? 100 : 0;

    const revenueGrowth = previousMonth.revenue > 0 
      ? Math.round(((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100)
      : currentMonth.revenue > 0 ? 100 : 0;

    return {
      salesGrowth,
      revenueGrowth,
      customerGrowth: Math.round(salesGrowth * 0.8), // Rough estimate
    };
  };

  // Extract available years from data
  const extractAvailableYears = (): number[] => {
    const yearsSet = new Set<number>();
    const now = new Date();
    
    // Add current year
    yearsSet.add(now.getFullYear());
    
    // Add previous 5 years as options
    for (let i = 1; i <= 5; i++) {
      yearsSet.add(now.getFullYear() - i);
    }
    
    // Sort descending
    return Array.from(yearsSet).sort((a, b) => b - a);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const navigateYear = (direction: "prev" | "next") => {
    const currentIndex = availableYears.indexOf(selectedYear);
    
    if (direction === "prev" && currentIndex < availableYears.length - 1) {
      setSelectedYear(availableYears[currentIndex + 1]);
    } else if (direction === "next" && currentIndex > 0) {
      setSelectedYear(availableYears[currentIndex - 1]);
    }
  };

  const getTimeframeLabel = () => {
    if (timeframeData?.description) {
      return timeframeData.description;
    }
    
    switch (timeframe) {
      case "day":
        if (selectedDate) {
          const date = new Date(selectedDate);
          return date.toLocaleDateString("fr-FR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        }
        return "Aujourd'hui";
      case "week":
        return "Cette Semaine";
      case "month":
        return "Ce Mois";
      case "year":
        return `Année ${selectedYear}`;
      default:
        return "Cette Semaine";
    }
  };

  const handleTimeframeChange = (period: "day" | "week" | "month" | "year") => {
    // For non-admin users, only allow "day" timeframe
    if (shouldSeeOnlyTodayData() && period !== "day") {
      return;
    }

    setTimeframe(period);

    if (period === "year") {
      // Set to current year if available
      const currentYear = new Date().getFullYear();
      if (availableYears.length > 0 && availableYears.includes(currentYear)) {
        setSelectedYear(currentYear);
      } else if (availableYears.length > 0) {
        setSelectedYear(availableYears[0]);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Analytiques
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Analyse approfondie de la performance de votre entreprise
            </p>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">
              Chargement des analytiques...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Analytiques
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Analyse approfondie de la performance de votre entreprise
            </p>
          </div>
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50 text-red-400" />
            <p className="text-sm sm:text-base">
              Aucune donnée disponible pour les analytiques
            </p>
          </div>
        </div>
      </div>
    );
  }

  const chartData = getChartDataForTimeframe();
  const maxRevenue = Math.max(...chartData.map((d: any) => d.revenue), 1);

  function getChartDataForTimeframe() {
    if (!analytics) return [];
    
    switch (timeframe) {
      case "day":
        return analytics.salesByDay;
      case "week":
        return analytics.salesByWeek;
      case "month":
        return analytics.salesByMonth;
      case "year": {
        const yearData = analytics.salesByYear.find(
          (y) => y.year === selectedYear.toString()
        );
        return yearData ? yearData.months : [];
      }
      default:
        return analytics.salesByWeek;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-200/60 backdrop-blur-xl sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Entre Nous Renove</p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">
                Bonjour, {user?.username || "Utilisateur"}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2">
                Vue opérationnelle de l'agence de <strong>{activeBranchId === "beni" ? "Beni" : "Butembo"}</strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {shouldSeeOnlyTodayData() && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-red-50 to-blue-50 text-red-700 px-3 py-2 rounded-lg border border-red-200 shadow-sm">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">
                    Vue limitée - Données du jour uniquement
                  </span>
                </div>
              )}
              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="px-3 py-2 bg-gradient-to-r from-red-600 to-blue-600 text-white hover:from-red-700 hover:to-blue-700 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-md hover:shadow-lg"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Actualiser</span>
              </button>
            </div>
          </div>
        </div>

        <section aria-labelledby="modules-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="modules-title" className="text-xl font-bold text-slate-900">Modules</h2>
              <p className="mt-1 text-sm text-slate-600">Accédez rapidement aux outils autorisés pour votre rôle.</p>
            </div>
            <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 sm:inline-flex">
              {activeBranchId === "beni" ? "Beni" : "Butembo"}
            </span>
          </div>
          <div className="grid auto-rows-[minmax(150px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {accessibleModules.map((item, index) => {
              const Icon = item.icon;
              const featured = item.id === "pos" || item.id === "products" || item.id === "reports";
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    featured
                      ? "border-blue-200/80 bg-gradient-to-br from-white via-blue-50/80 to-indigo-100/70 sm:col-span-2"
                      : "border-slate-200/80 bg-white/90"
                  } ${index === 0 ? "xl:row-span-2" : ""}`}
                >
                  <div className="flex h-full min-h-[110px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <span className="rounded-2xl bg-slate-950 p-3 text-white shadow-md transition-transform duration-200 group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </span>
                      <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-700" />
                    </div>
                    <div className="mt-6">
                      <h3 className="text-base font-bold uppercase tracking-wide text-slate-950">{item.label}</h3>
                      <p className="mt-1.5 max-w-md text-sm leading-5 text-slate-600">{moduleDescriptions[item.id] || "Ouvrir ce module"}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Timeframe Selection */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                Période d'analyse: <span className="text-red-600 font-bold">{getTimeframeLabel()}</span>
              </h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Date Picker for Day View */}
                {timeframe === "day" && (
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-3 py-2 shadow-sm w-full sm:w-auto">
                    <Calendar className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <label
                      htmlFor="date-picker"
                      className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap"
                    >
                      Date:
                    </label>
                    <input
                      id="date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="ml-2 px-2 py-1 border-none bg-transparent text-xs sm:text-sm focus:outline-none focus:ring-0 text-gray-900 font-medium w-full"
                      disabled={shouldSeeOnlyTodayData()}
                    />
                  </div>
                )}

                {timeframe === "year" && availableYears.length > 1 && (
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-3 py-2 shadow-sm w-full sm:w-auto">
                    <button
                      onClick={() => navigateYear("prev")}
                      disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600 hover:text-red-600"
                    >
                      <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <span className="text-xs sm:text-sm font-medium text-gray-900 px-2 min-w-[60px] sm:min-w-[80px] text-center">
                      {selectedYear}
                    </span>
                    <button
                      onClick={() => navigateYear("next")}
                      disabled={availableYears.indexOf(selectedYear) === 0}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-600 hover:text-red-600"
                    >
                      <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                )}

                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                  {(["day", "week", "month", "year"] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => handleTimeframeChange(period)}
                      className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 flex-1 sm:flex-none ${
                        timeframe === period
                          ? "bg-gradient-to-r from-red-600 to-blue-600 text-white shadow-md"
                          : shouldSeeOnlyTodayData() && period !== "day"
                          ? "text-gray-400 cursor-not-allowed opacity-50"
                          : "text-gray-600 hover:text-red-600 hover:bg-white"
                      }`}
                      disabled={shouldSeeOnlyTodayData() && period !== "day"}
                    >
                      {period === "day" && "Jour"}
                      {period === "week" && "Semaine"}
                      {period === "month" && "Mois"}
                      {period === "year" && "Année"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Nombre Total de Ventes
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {analytics.totalSales}
                  </p>
                  <div className="flex items-center mt-1">
                    {analytics.recentTrends.salesGrowth >= 0 ? (
                      <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                    ) : (
                      <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                    )}
                    <span
                      className={`text-xs sm:text-sm ml-1 ${
                        analytics.recentTrends.salesGrowth >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {Math.abs(analytics.recentTrends.salesGrowth)}%
                    </span>
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-red-100 to-blue-100 rounded-full">
                  <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                </div>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-red-600 to-blue-600"></div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Revenu Total de ventes</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics.totalRevenue)}
                  </p>
                  <div className="flex items-center mt-1">
                    {analytics.recentTrends.revenueGrowth >= 0 ? (
                      <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                    ) : (
                      <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                    )}
                    <span
                      className={`text-xs sm:text-sm ml-1 ${
                        analytics.recentTrends.revenueGrowth >= 0
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {Math.abs(analytics.recentTrends.revenueGrowth)}%
                    </span>
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full">
                  <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Entrées d'Argent
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics.totalEntries)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total reçu</p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full">
                  <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-yellow-500 to-amber-500"></div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Dépenses Validées
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics.totalValidatedExpenses)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total validé</p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-red-100 to-rose-100 rounded-full">
                  <Receipt className="w-4 h-4 sm:w-6 sm:h-6 text-red-600" />
                </div>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-500"></div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Revenu Net</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {formatCurrency(analytics.netRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">(Ventes + Entrées) - Dépenses</p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-100 to-violet-100 rounded-full">
                  <Calculator className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-violet-500"></div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Clients Totaux
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {analytics.totalCustomers}
                  </p>
                  <div className="flex items-center mt-1">
                    <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                    <span className="text-xs sm:text-sm ml-1 text-green-500">
                      {analytics.recentTrends.customerGrowth}%
                    </span>
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
                </div>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-amber-500"></div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Produits Totaux
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {analytics.totalProducts}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Produits actifs</p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full">
                  <Package className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
                </div>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-blue-500"></div>
          </div>
        </div>

        {/* Sales Chart */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                Tendances des Ventes ({getTimeframeLabel()})
              </h3>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4 overflow-x-auto">
            {timeframe === "year" ? (
              // Yearly view with months for selected year
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-500" />
                  Année {selectedYear}
                </h4>
                <div className="space-y-4 ml-0 sm:ml-4 min-w-[300px]">
                  {chartData.map((month: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 sm:gap-4"
                    >
                      <div className="w-28 sm:w-40 text-xs sm:text-sm text-gray-600 font-medium capitalize">
                        {month.monthName}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs sm:text-sm text-gray-700 truncate">
                            {month.sales} ventes
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap ml-2">
                            {formatCurrency(month.revenue)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-red-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(month.revenue / maxRevenue) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Daily, Weekly, Monthly view
              chartData.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 sm:gap-4 min-w-[300px]"
                >
                  <div className="w-32 sm:w-48 text-xs sm:text-sm text-gray-600 font-medium">
                    {timeframe === "day" ? (
                      <div>
                        <div className="capitalize">
                          {item.dayName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.date}
                        </div>
                      </div>
                    ) : timeframe === "week" ? (
                      <div>
                        <div className="text-xs sm:text-sm">
                          {item.week}
                        </div>
                        <div className="text-xs text-gray-500">
                          Du {item.startDate} au {item.endDate}
                        </div>
                      </div>
                    ) : timeframe === "month" ? (
                      <div className="capitalize">
                        {item.monthName}
                      </div>
                    ) : (
                      item.monthName
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm text-gray-700">
                        {item.sales} ventes
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap ml-2">
                        {formatCurrency(item.revenue)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-red-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(item.revenue / maxRevenue) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Product performance */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                Meilleurs articles vendus ({getTimeframeLabel()})
              </h3>
            </div>
            <div className="p-4 sm:p-6 space-y-3 max-h-96 overflow-y-auto">
              {analytics.topProducts.length > 0 ? (
                analytics.topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:from-red-50 hover:to-blue-50 transition-all duration-200 border border-gray-100 hover:border-red-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                        {index + 1}. {product.name}
                      </p>
                      <p className="text-xs text-gray-500">Classement par volume vendu</p>
                      </div>
                      <p className="font-medium text-gray-900 text-sm sm:text-base whitespace-nowrap">
                        {formatCurrency(product.revenue)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-800">
                        {product.normalCartons} carton{product.normalCartons > 1 ? "s" : ""}
                      </span>
                      {product.normalPieces > 0 && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">
                          {product.normalPieces} pièce{product.normalPieces > 1 ? "s" : ""} vendue{product.normalPieces > 1 ? "s" : ""} séparément
                        </span>
                      )}
                      <span className="ml-auto text-xs text-emerald-700">
                        Stock: {formatCartonQuantity(product.remainingStock, product.piecesPerCarton)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50 text-red-400" />
                  <p className="font-medium text-sm sm:text-base">
                    Aucun produit vendu
                  </p>
                  <p className="text-xs sm:text-sm">dans cette période</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-white">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                Produits donnés en bonus ({getTimeframeLabel()})
              </h3>
              <p className="mt-1 text-xs text-gray-500">Quantités offertes, séparées des ventes normales</p>
            </div>
            <div className="p-4 sm:p-6 space-y-3 max-h-96 overflow-y-auto">
              {analytics.topProducts.some((product) => product.bonusQuantity > 0) ? (
                analytics.topProducts
                  .filter((product) => product.bonusQuantity > 0)
                  .sort((a, b) => b.bonusQuantity - a.bonusQuantity)
                  .map((product) => (
                    <div key={product.name} className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                          Bonus
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-amber-800">
                        {formatRecordedUnits(product.bonusCartons, product.bonusPieces)}
                      </p>
                    </div>
                  ))
              ) : (
                <div className="py-8 text-center text-sm text-gray-500">
                  Aucun produit donné en bonus pendant cette période.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                Meilleurs Clients ({getTimeframeLabel()})
              </h3>
            </div>
            <div className="p-4 sm:p-6 space-y-3 max-h-96 overflow-y-auto">
              {analytics.topCustomers.length > 0 ? (
                analytics.topCustomers.map((customer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:from-red-50 hover:to-blue-50 transition-all duration-200 border border-gray-100 hover:border-red-200"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-red-600 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                        <span className="text-xs sm:text-sm font-medium text-white">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                          {customer.name}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {customer.purchases} achats
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="font-medium text-gray-900 text-sm sm:text-base whitespace-nowrap">
                        {formatCurrency(customer.totalSpent)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50 text-red-400" />
                  <p className="font-medium text-sm sm:text-base">
                    Aucun client
                  </p>
                  <p className="text-xs sm:text-sm">dans cette période</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
