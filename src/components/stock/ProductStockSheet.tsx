import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2, WifiOff } from "lucide-react";
import PeriodSelector from "../reports/PeriodSelector";
import ExportPdfButton from "../reports/ExportPdfButton";
import { fetchReport } from "../../services/reportApi";
import { DATA_CHANGED_EVENT, getActiveBranchId } from "../../services/dataSync";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { defaultPeriod, periodLabel, stockReportParams, type PeriodValue } from "../../utils/businessDate";
import { formatCartonsPieces, formatPieces } from "../../utils/quantity";
import { downloadProductStockPdf, stockRowLabel } from "../../utils/stockReportPdf";
import type { ProductStockReport, StockMovementTotals } from "../../types/stockReport";

interface ProductStockSheetProps {
  productId: string;
  productName?: string;
  initialPeriod?: PeriodValue;
}

const SUMMARY: Array<{ key: keyof StockMovementTotals; label: string; tone: string; signed?: boolean }> = [
  { key: "opening", label: "Stock initial", tone: "border-slate-300" },
  { key: "sold", label: "Cartons et pièces vendus", tone: "border-rose-300" },
  { key: "bonus", label: "Bonus", tone: "border-amber-300" },
  { key: "additions", label: "Ajouts", tone: "border-emerald-300" },
  { key: "removals", label: "Retraits", tone: "border-orange-300" },
  { key: "otherNet", label: "Autres mouvements", tone: "border-violet-300", signed: true },
  { key: "closing", label: "Stock final", tone: "border-slate-900" },
];

/**
 * Individual Fiche de stock: one product, one branch, one period. Shows only
 * summarized figures (period totals + one row per calendar day, or per month
 * for a year) — never individual transactions. Numbers come verbatim from
 * GET /api/stock-reports/product/:id (same service as the global report).
 */
export default function ProductStockSheet({ productId, productName, initialPeriod }: ProductStockSheetProps) {
  const online = useOnlineStatus();
  const [period, setPeriod] = useState<PeriodValue>(() => initialPeriod || defaultPeriod("month"));
  const [report, setReport] = useState<ProductStockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!navigator.onLine) return;
    const id = ++requestId.current;
    const branch = getActiveBranchId();
    setLoading(true);
    setError("");
    try {
      const data = await fetchReport<ProductStockReport>(`/stock-reports/product/${productId}`, stockReportParams(period));
      // Ignore stale answers (period changed or branch switched meanwhile).
      if (id !== requestId.current || branch !== getActiveBranchId()) return;
      setReport(data);
    } catch (loadError) {
      if (id !== requestId.current) return;
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger la fiche de stock");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [productId, period]);

  useEffect(() => {
    void load();
  }, [load, online]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, [load]);

  const item = report?.item;
  const ppc = item?.piecesPerCarton || 1;
  const label = periodLabel(period);

  return (
    <div className="space-y-4">
      <PeriodSelector value={period} onChange={setPeriod} disabled={loading && !report} className="stock-period-selector" />

      {!online && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <WifiOff className="h-4 w-4" /> Connexion requise : la fiche de stock est calculée par le serveur à partir du registre des mouvements.
        </div>
      )}

      {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {loading && !report && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Calcul de la fiche de stock…
        </div>
      )}

      {item && report && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-slate-500">Article</dt><dd className="font-semibold text-slate-900">{item.name}{item.status === "inactive" && <span className="ml-1 rounded bg-slate-200 px-1.5 text-xs">inactif</span>}</dd></div>
              <div><dt className="text-xs text-slate-500">Catégorie</dt><dd className="font-medium text-slate-800">{item.category || "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Marque</dt><dd className="font-medium text-slate-800">{item.brand || "—"}</dd></div>
              <div><dt className="text-xs text-slate-500">Agence</dt><dd className="font-medium text-slate-800">{report.branch.name}</dd></div>
              <div><dt className="text-xs text-slate-500">Pièces par carton</dt><dd className="font-medium text-slate-800">{ppc}</dd></div>
              <div><dt className="text-xs text-slate-500">Période</dt><dd className="font-medium text-slate-800">{label}</dd></div>
            </dl>
            <ExportPdfButton onExport={async () => { downloadProductStockPdf(report, label); return item.rows?.length || 0; }} />
          </div>

          {item.warnings.length > 0 && (
            <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              {item.warnings.map((warning) => (
                <p key={warning.code} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{warning.message}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {SUMMARY.map((card) => (
              <div key={card.key} className={`rounded-xl border-l-4 bg-white p-2.5 shadow-sm sm:p-3 ${card.tone}`}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</div>
                <div className="mt-1 text-base font-bold text-slate-950">{formatCartonsPieces(item[card.key], ppc, { signed: card.signed })}</div>
                <div className="text-[11px] text-slate-500">{formatPieces(item[card.key])}</div>
              </div>
            ))}
          </div>

          <div className="app-data-scroll desktop-data-table max-h-[min(32rem,48dvh)] rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left">{report.period.granularity === "month" ? "Mois" : "Date"}</th>
                  <th className="px-3 py-2 text-right">Stock initial</th>
                  <th className="px-3 py-2 text-right">Vendus</th>
                  <th className="px-3 py-2 text-right">Bonus</th>
                  <th className="px-3 py-2 text-right">Ajouts</th>
                  <th className="px-3 py-2 text-right">Retraits</th>
                  <th className="px-3 py-2 text-right">Autres</th>
                  <th className="px-3 py-2 text-right">Stock final</th>
                </tr>
              </thead>
              <tbody>
                {(item.rows || []).map((row) => {
                  const quiet = row.totalIn === 0 && row.totalOut === 0;
                  return (
                    <tr key={row.key} className={`border-t border-slate-100 ${quiet ? "text-slate-400" : "text-slate-900"}`}>
                      <td className="whitespace-nowrap px-3 py-1.5 font-medium">{stockRowLabel(row)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">{formatCartonsPieces(row.opening, ppc)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">{formatCartonsPieces(row.sold, ppc)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">{formatCartonsPieces(row.bonus, ppc)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">{formatCartonsPieces(row.additions, ppc)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">{formatCartonsPieces(row.removals, ppc)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right">{formatCartonsPieces(row.otherNet, ppc, { signed: true })}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold">{formatCartonsPieces(row.closing, ppc)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mobile-record-list">
            {(item.rows || []).map((row) => {
              const quiet = row.totalIn === 0 && row.totalOut === 0;
              return (
                <details key={row.key} className={`mobile-record-card group ${quiet ? "opacity-70" : ""}`}>
                  <summary className="mobile-record-summary">
                    <span>
                      <span className="block text-sm font-bold text-slate-950">{stockRowLabel(row)}</span>
                      <span className="block text-[11px] text-slate-500">Initial : {formatCartonsPieces(row.opening, ppc)}</span>
                    </span>
                    <span className="flex items-center gap-2 text-right">
                      <span>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Final</span>
                        <span className="block text-sm font-black text-slate-950">{formatCartonsPieces(row.closing, ppc)}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="mobile-record-detail">
                    <dl className="mobile-record-grid">
                      <div className="mobile-record-metric"><dt>Vendus</dt><dd>{formatCartonsPieces(row.sold, ppc)}</dd></div>
                      <div className="mobile-record-metric"><dt>Bonus</dt><dd>{formatCartonsPieces(row.bonus, ppc)}</dd></div>
                      <div className="mobile-record-metric"><dt>Ajouts</dt><dd>{formatCartonsPieces(row.additions, ppc)}</dd></div>
                      <div className="mobile-record-metric"><dt>Retraits</dt><dd>{formatCartonsPieces(row.removals, ppc)}</dd></div>
                      <div className="mobile-record-metric"><dt>Autres</dt><dd>{formatCartonsPieces(row.otherNet, ppc, { signed: true })}</dd></div>
                    </dl>
                  </div>
                </details>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Stock final = stock initial + entrées (ajouts, autres +) − sorties (ventes, bonus, retraits, autres −).
            Les jours sans mouvement sont affichés en gris. Stock actuel : {formatCartonsPieces(item.currentStock, ppc)}.
          </p>
        </>
      )}

      {!loading && !error && !report && online && (
        <p className="py-8 text-center text-sm text-slate-500">Aucune donnée pour {productName || "cet article"}.</p>
      )}
    </div>
  );
}
