/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import {
  AlertCircle,
  Calendar,
  Download,
  FileText,
  Package,
  Printer,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { GMT_PLUS_2_TIME_ZONE } from "../utils/time";

const API_BASE = import.meta.env.VITE_API_URL;
const COMPANY_NAME = "Ets Dieu merci";

type ReportRange = "today" | "month" | "year" | "custom";

interface ReportData {
  sales: any[];
  expenses: any[];
  entries: any[];
  products: any[];
  customers: any[];
  salesSummary?: any;
  expensesSummary?: any;
  entriesSummary?: any;
  customersStats?: any;
  exchangeRate?: any;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function monthStartIso() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function monthEndIso() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function formatDate(value?: string | Date) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: GMT_PLUS_2_TIME_ZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value?: string | Date) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: GMT_PLUS_2_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Number.isFinite(value) ? value : 0);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Une erreur est survenue";
}

export default function CompanyReport() {
  const reportRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const [range, setRange] = useState<ReportRange>("month");
  const [fromDate, setFromDate] = useState(monthStartIso());
  const [toDate, setToDate] = useState(monthEndIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportData>({
    sales: [],
    expenses: [],
    entries: [],
    products: [],
    customers: [],
  });

  const reportPeriod = useMemo(() => {
    if (range === "today") return { from: todayIso(), to: todayIso(), label: "Aujourd'hui" };
    if (range === "year") {
      const year = new Date().getFullYear();
      return { from: `${year}-01-01`, to: `${year}-12-31`, label: `Année ${year}` };
    }
    if (range === "custom") return { from: fromDate, to: toDate, label: "Période personnalisée" };
    return { from: monthStartIso(), to: monthEndIso(), label: "Mois en cours" };
  }, [fromDate, range, toDate]);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  async function apiGet(path: string) {
    const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.message || payload?.error || `Requête échouée (${res.status})`);
    }
    return payload;
  }

  async function loadReport() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        from: reportPeriod.from,
        to: reportPeriod.to,
      });

      const [
        salesRes,
        expensesRes,
        entriesRes,
        productsRes,
        customersRes,
        exchangeRateRes,
      ] = await Promise.all([
        apiGet(`/sales?${params.toString()}`),
        apiGet(`/expenses?${params.toString()}&status=all`),
        apiGet(`/entries?${params.toString()}&status=all`),
        apiGet("/products"),
        apiGet("/customers/all"),
        apiGet("/exchange-rates/current").catch(() => null),
      ]);

      setData({
        sales: Array.isArray(salesRes?.data) ? salesRes.data : [],
        expenses: Array.isArray(expensesRes?.data) ? expensesRes.data : [],
        entries: Array.isArray(entriesRes?.data) ? entriesRes.data : [],
        products: Array.isArray(productsRes) ? productsRes : [],
        customers: Array.isArray(customersRes?.customers) ? customersRes.customers : [],
        salesSummary: salesRes?.summary,
        expensesSummary: expensesRes?.summary,
        entriesSummary: entriesRes?.summary,
        customersStats: customersRes?.stats,
        exchangeRate: exchangeRateRes,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportPeriod.from, reportPeriod.to]);

  const totals = useMemo(() => {
    const salesRevenue =
      Number(data.salesSummary?.revenue) ||
      data.sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
    const validatedExpenses =
      Number(data.expensesSummary?.validated?.amount) ||
      data.expenses
        .filter((expense) => expense.status === "validated")
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const entriesAmount =
      Number(data.entriesSummary?.active?.amount) ||
      data.entries
        .filter((entry) => entry.status !== "deleted")
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const lowStock = data.products.filter(
      (product) => Number(product.stock || 0) <= Number(product.minStock || 0)
    ).length;

    return {
      salesRevenue,
      validatedExpenses,
      entriesAmount,
      netResult: salesRevenue + entriesAmount - validatedExpenses,
      salesCount: data.sales.length,
      expensesCount: data.expenses.length,
      entriesCount: data.entries.length,
      productsCount: data.products.length,
      customersCount: data.customers.length,
      lowStock,
    };
  }, [data]);

  const topProducts = useMemo(() => {
    const byName = new Map<string, { name: string; quantity: number; bonus: number; revenue: number }>();

    data.sales.forEach((sale) => {
      (sale.items || []).forEach((item: any) => {
        const name = item.name || "Article";
        const current = byName.get(name) || { name, quantity: 0, bonus: 0, revenue: 0 };
        current.quantity += Number(item.quantity || 0);
        current.bonus += Number(item.bonusQuantity || 0);
        current.revenue += Number(
          item.total ||
            (Number(item.price || 0) *
              (Number(item.paidQuantity ?? item.quantity ?? 0) /
                Math.max(1, Number(item.piecesPerCarton || 1)))) ||
            0
        );
        byName.set(name, current);
      });
    });

    return Array.from(byName.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [data.sales]);

  const recentMovements = useMemo(() => {
    const sales = data.sales.slice(0, 5).map((sale) => ({
      date: sale.createdAt || sale.saleDate,
      label: sale.saleId || sale.saleNumber || sale.customer?.name || "Vente",
      type: "Vente",
      amount: Number(sale.total || 0),
    }));
    const expenses = data.expenses.slice(0, 5).map((expense) => ({
      date: expense.createdAt,
      label: expense.reason || expense.expenseId || "Sortie",
      type: "Sortie",
      amount: -Number(expense.amount || 0),
    }));
    const entries = data.entries.slice(0, 5).map((entry) => ({
      date: entry.createdAt,
      label: entry.source || entry.entryId || "Entrée",
      type: "Entrée",
      amount: Number(entry.amount || 0),
    }));

    return [...sales, ...expenses, ...entries]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 10);
  }, [data.entries, data.expenses, data.sales]);

  function handlePrint() {
    window.print();
  }

  function downloadPdf() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    let y = 18;

    const addPageIfNeeded = (height = 12) => {
      if (y + height > pageHeight - 18) {
        doc.addPage();
        y = 18;
      }
    };

    const sectionTitle = (title: string) => {
      addPageIfNeeded(14);
      doc.setFillColor(237, 242, 247);
      doc.roundedRect(margin, y, pageWidth - margin * 2, 9, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, margin + 3, y + 6);
      y += 14;
    };

    const line = (label: string, value: string) => {
      addPageIfNeeded(8);
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, margin + 65, y);
      y += 7;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(COMPANY_NAME, margin, y);
    y += 8;
    doc.setFontSize(14);
    doc.text("RAPPORT GENERAL DE L'ENTREPRISE", margin, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Période: ${formatDate(reportPeriod.from)} au ${formatDate(reportPeriod.to)}`, margin, y);
    y += 6;
    doc.text(`Généré le: ${formatDateTime(new Date())}`, margin, y);
    y += 6;
    doc.text(`Préparé par: ${user?.username || "Utilisateur"}`, margin, y);
    y += 12;

    sectionTitle("Résumé financier");
    line("Revenu des ventes", formatMoney(totals.salesRevenue));
    line("Entrées de caisse", formatMoney(totals.entriesAmount));
    line("Sorties validées", formatMoney(totals.validatedExpenses));
    line("Résultat net estimé", formatMoney(totals.netResult));
    line("Taux du jour", data.exchangeRate?.rate ? `1 USD = ${formatNumber(data.exchangeRate.rate)} FC` : "Non disponible");

    sectionTitle("Activité");
    line("Nombre de ventes", formatNumber(totals.salesCount));
    line("Nombre d'entrées", formatNumber(totals.entriesCount));
    line("Nombre de sorties", formatNumber(totals.expensesCount));
    line("Clients enregistrés", formatNumber(totals.customersCount));
    line("Articles au catalogue", formatNumber(totals.productsCount));
    line("Articles en alerte stock", formatNumber(totals.lowStock));

    sectionTitle("Meilleurs articles");
    if (topProducts.length === 0) {
      line("Observation", "Aucune vente d'article sur la période.");
    } else {
      topProducts.forEach((product, index) => {
        line(
          `${index + 1}. ${product.name.slice(0, 28)}`,
          `${formatNumber(product.quantity)} pcs (${formatNumber(product.bonus)} bonus) - ${formatMoney(product.revenue)}`
        );
      });
    }

    sectionTitle("Derniers mouvements");
    recentMovements.forEach((movement) => {
      line(
        `${formatDate(movement.date)} - ${movement.type}`,
        `${movement.label.slice(0, 30)} - ${formatMoney(movement.amount)}`
      );
    });

    sectionTitle("Validation");
    doc.setFont("helvetica", "normal");
    doc.text("Date: ______________________________", margin, y);
    y += 12;
    doc.text("Nom et signature du responsable: ______________________________", margin, y);
    y += 16;
    doc.rect(margin, y, 55, 28);
    doc.text("Cachet de l'entreprise", margin + 7, y + 16);
    doc.rect(pageWidth - margin - 55, y, 55, 28);
    doc.text("Signature", pageWidth - margin - 39, y + 16);

    doc.save(`rapport-${COMPANY_NAME.toLowerCase().replaceAll(" ", "-")}-${reportPeriod.from}-${reportPeriod.to}.pdf`);
  }

  const cards = [
    {
      label: "Revenu des ventes",
      value: formatMoney(totals.salesRevenue),
      icon: TrendingUp,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      label: "Entrées de caisse",
      value: formatMoney(totals.entriesAmount),
      icon: TrendingUp,
      tone: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      label: "Sorties validées",
      value: formatMoney(totals.validatedExpenses),
      icon: TrendingDown,
      tone: "text-red-700 bg-red-50 border-red-200",
    },
    {
      label: "Résultat net estimé",
      value: formatMoney(totals.netResult),
      icon: FileText,
      tone: totals.netResult >= 0 ? "text-slate-800 bg-slate-50 border-slate-200" : "text-red-700 bg-red-50 border-red-200",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="no-print rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
                Rapport d'entreprise
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">
                {COMPANY_NAME}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Consultez, imprimez ou téléchargez un rapport professionnel prêt à signer.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[160px_160px_160px_auto_auto]">
              <label className="text-sm font-medium text-slate-700">
                Période
                <select
                  value={range}
                  onChange={(event) => setRange(event.target.value as ReportRange)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="today">Aujourd'hui</option>
                  <option value="month">Mois en cours</option>
                  <option value="year">Année en cours</option>
                  <option value="custom">Personnalisée</option>
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Du
                <input
                  type="date"
                  value={reportPeriod.from}
                  disabled={range !== "custom"}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Au
                <input
                  type="date"
                  value={reportPeriod.to}
                  disabled={range !== "custom"}
                  onChange={(event) => setToDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                />
              </label>

              <button
                type="button"
                onClick={loadReport}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Actualiser
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </button>
                <button
                  type="button"
                  onClick={downloadPdf}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div ref={reportRef} className="report-paper bg-white p-5 text-slate-950 shadow-lg sm:p-8">
          <header className="border-b-4 border-slate-900 pb-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
                  Rapport
                </p>
                <h2 className="mt-2 text-3xl font-black uppercase text-slate-950">
                  {COMPANY_NAME}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Rapport général des ventes, entrées, sorties, clients, articles et mouvements
                  de caisse.
                </p>
              </div>
              <div className="rounded-lg border border-slate-300 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Calendar className="h-4 w-4 text-blue-700" />
                  {reportPeriod.label}
                </div>
                <p className="mt-2">Du: {formatDate(reportPeriod.from)}</p>
                <p>Au: {formatDate(reportPeriod.to)}</p>
                <p className="mt-2 text-slate-600">Généré le: {formatDateTime(new Date())}</p>
              </div>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className={`rounded-lg border p-4 ${card.tone}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{card.label}</p>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-2xl font-black">{card.value}</p>
                </div>
              );
            })}
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <FileText className="h-5 w-5 text-blue-700" />
                <h3 className="font-bold">Résumé de l'activité</h3>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Ventes enregistrées</dt>
                  <dd className="font-bold">{formatNumber(totals.salesCount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Entrées de caisse</dt>
                  <dd className="font-bold">{formatNumber(totals.entriesCount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Sorties de caisse</dt>
                  <dd className="font-bold">{formatNumber(totals.expensesCount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Taux du jour</dt>
                  <dd className="font-bold">
                    {data.exchangeRate?.rate ? `1 USD = ${formatNumber(data.exchangeRate.rate)} FC` : "-"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Users className="h-5 w-5 text-blue-700" />
                <h3 className="font-bold">Clients</h3>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Clients enregistrés</dt>
                  <dd className="font-bold">{formatNumber(totals.customersCount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Clients avec achats</dt>
                  <dd className="font-bold">
                    {formatNumber(Number(data.customersStats?.customersWithPurchases || 0))}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Achat moyen</dt>
                  <dd className="font-bold">{formatMoney(Number(data.customersStats?.averageSpent || 0))}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Package className="h-5 w-5 text-blue-700" />
                <h3 className="font-bold">Stock</h3>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Articles actifs</dt>
                  <dd className="font-bold">
                    {formatNumber(data.products.filter((product) => product.status !== "inactive").length)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Total catalogue</dt>
                  <dd className="font-bold">{formatNumber(totals.productsCount)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Alertes stock</dt>
                  <dd className="font-bold text-red-700">{formatNumber(totals.lowStock)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Meilleurs articles vendus</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Article</th>
                      <th className="py-2 pr-3">Quantité</th>
                      <th className="py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-500">
                          Aucun article vendu sur cette période.
                        </td>
                      </tr>
                    ) : (
                      topProducts.map((product) => (
                        <tr key={product.name}>
                          <td className="py-2 pr-3 font-medium">{product.name}</td>
                          <td className="py-2 pr-3">
                            {formatNumber(product.quantity)}
                            {product.bonus > 0 ? ` (${formatNumber(product.bonus)} bonus)` : ""}
                          </td>
                          <td className="py-2 text-right font-semibold">{formatMoney(product.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Derniers mouvements</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Libellé</th>
                      <th className="py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentMovements.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-500">
                          Aucun mouvement sur cette période.
                        </td>
                      </tr>
                    ) : (
                      recentMovements.map((movement, index) => (
                        <tr key={`${movement.type}-${index}`}>
                          <td className="py-2 pr-3">{formatDate(movement.date)}</td>
                          <td className="py-2 pr-3">{movement.type}</td>
                          <td className="py-2 pr-3 font-medium">{movement.label}</td>
                          <td className={`py-2 text-right font-semibold ${movement.amount < 0 ? "text-red-700" : "text-emerald-700"}`}>
                            {formatMoney(movement.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-900">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              <h3 className="font-bold">Observations et validation</h3>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
              <div>
                <p className="font-semibold text-slate-700">Observation</p>
                <div className="mt-2 h-24 rounded-lg border border-dashed border-slate-300 bg-slate-50" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Nom, date et signature</p>
                <div className="mt-2 h-24 rounded-lg border border-dashed border-slate-300 bg-slate-50" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">Cachet de l'entreprise</p>
                <div className="mt-2 flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                  Espace cachet
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
