import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
import PeriodSelector from "../reports/PeriodSelector";
import ExportPdfButton from "../reports/ExportPdfButton";
import { fetchReport } from "../../services/reportApi";
import { DATA_CHANGED_EVENT, getActiveBranchId } from "../../services/dataSync";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { defaultPeriod, formatDayFr, periodLabel, stockReportParams, type PeriodValue } from "../../utils/businessDate";
import { formatCartonsPieces, formatPieces } from "../../utils/quantity";
import { downloadProductStockPdf } from "../../utils/stockReportPdf";
import type { ProductStockReport, StockMovementTotals } from "../../types/stockReport";

interface ProductStockSheetProps {
  productId: string;
  productName?: string;
  initialPeriod?: PeriodValue;
}

const SUMMARY: Array<{ key: keyof StockMovementTotals; label: string; tone: string; signed?: boolean }> = [
  { key: "opening", label: "Stock initial", tone: "border-l-slate-400" },
  { key: "sold", label: "Cartons et pièces vendus", tone: "border-l-rose-400" },
  { key: "bonus", label: "Bonus", tone: "border-l-amber-400" },
  { key: "additions", label: "Ajouts", tone: "border-l-emerald-400" },
  { key: "removals", label: "Retraits", tone: "border-l-orange-400" },
  { key: "otherNet", label: "Autres mouvements", tone: "border-l-violet-400", signed: true },
  { key: "closing", label: "Stock final", tone: "border-l-slate-950" },
];

/**
 * Individual Fiche de stock: one product, one branch and one summarized
 * period. Values come verbatim from the same authoritative stock ledger as
 * the global report; this component never renders transaction or daily rows.
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
  const rangeLabel = report
    ? `${formatDayFr(report.period.from)} – ${formatDayFr(report.period.to)}`
    : label;

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3" aria-labelledby="stock-product-identity">
        <h3 id="stock-product-identity" className="sr-only">Informations sur l'article</h3>
        {item && report ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs font-medium text-slate-500">Article</dt>
              <dd className="font-bold text-slate-950">
                {item.name}
                {item.status === "inactive" && <span className="ml-1 rounded bg-slate-200 px-1.5 text-xs">inactif</span>}
              </dd>
            </div>
            <div><dt className="text-xs font-medium text-slate-500">Catégorie</dt><dd className="font-semibold text-slate-800">{item.category || "—"}</dd></div>
            <div><dt className="text-xs font-medium text-slate-500">Marque</dt><dd className="font-semibold text-slate-800">{item.brand || "—"}</dd></div>
            <div><dt className="text-xs font-medium text-slate-500">Agence</dt><dd className="font-semibold text-slate-800">{report.branch.name}</dd></div>
            <div><dt className="text-xs font-medium text-slate-500">Pièces par carton</dt><dd className="font-semibold text-slate-800">{ppc}</dd></div>
            <div><dt className="text-xs font-medium text-slate-500">Stock actuel</dt><dd className="font-bold text-slate-950">{formatCartonsPieces(item.currentStock, ppc)}</dd></div>
          </dl>
        ) : (
          <div>
            <p className="text-xs font-medium text-slate-500">Article</p>
            <p className="font-bold text-slate-950">{productName || "Fiche de stock"}</p>
          </div>
        )}
      </section>

      <section aria-labelledby="stock-period-heading">
        <h3 id="stock-period-heading" className="sr-only">Période de la fiche</h3>
        <PeriodSelector value={period} onChange={setPeriod} disabled={loading && !report} className="stock-period-selector" />
        <p className="mt-2 text-sm font-semibold text-slate-700">
          Période : <span className="text-slate-950">{rangeLabel}</span>
        </p>
      </section>

      {!online && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <WifiOff className="h-4 w-4" /> Connexion requise : la fiche de stock est calculée par le serveur à partir du registre des mouvements.
        </div>
      )}

      {error && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      {loading && !report && (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Calcul de la fiche de stock…
        </div>
      )}

      {item && report && (
        <>
          {item.warnings.length > 0 && (
            <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              {item.warnings.map((warning) => (
                <p key={warning.code} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{warning.message}</p>
              ))}
            </div>
          )}

          <section aria-labelledby="stock-summary-heading">
            <h3 id="stock-summary-heading" className="mb-2 text-sm font-bold text-slate-900">Synthèse des stocks</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {SUMMARY.map((card) => (
                <div key={card.key} className={`min-w-0 rounded-xl border border-slate-200 border-l-4 bg-white p-2.5 shadow-sm sm:p-3 ${card.tone}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</div>
                  <div className="mt-1 break-words text-sm font-bold leading-snug text-slate-950 sm:text-base">
                    {formatCartonsPieces(item[card.key], ppc, { signed: card.signed })}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{formatPieces(item[card.key])}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="stock-export-heading">
            <div>
              <h3 id="stock-export-heading" className="text-sm font-bold text-slate-900">Export de la fiche</h3>
              <p className="text-xs text-slate-500">Le PDF contient uniquement la synthèse de la période sélectionnée.</p>
            </div>
            <ExportPdfButton
              className="w-full shrink-0 sm:w-auto"
              onExport={async () => {
                downloadProductStockPdf(report, rangeLabel);
                return 1;
              }}
            />
          </section>
        </>
      )}

      {!loading && !error && !report && online && (
        <p className="py-8 text-center text-sm text-slate-500">Aucune donnée pour {productName || "cet article"}.</p>
      )}
    </div>
  );
}
