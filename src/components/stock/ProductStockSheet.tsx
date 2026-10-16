import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Loader2, WifiOff } from "lucide-react";
import PeriodSelector from "../reports/PeriodSelector";
import ExportPdfButton from "../reports/ExportPdfButton";
import { fetchReport } from "../../services/reportApi";
import { DATA_CHANGED_EVENT, getActiveBranchId } from "../../services/dataSync";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { defaultPeriod, formatDayFr, formatMonthFr, periodLabel, stockReportParams, type PeriodValue } from "../../utils/businessDate";
import { formatDateTimeGmt2 } from "../../utils/time";
import { formatCartonsPieces, formatPieces } from "../../utils/quantity";
import { downloadProductStockPdf } from "../../utils/stockReportPdf";
import StockDocumentsPanel from "./StockDocumentsPanel";
import type { ProductStockReport, StockMovementTotals, StockReportRow, StockTransaction } from "../../types/stockReport";

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

const CATEGORY_TONE: Record<StockTransaction["category"], string> = {
  sold: "bg-rose-50 text-rose-700",
  bonus: "bg-amber-50 text-amber-700",
  additions: "bg-emerald-50 text-emerald-700",
  removals: "bg-orange-50 text-orange-700",
  otherIn: "bg-violet-50 text-violet-700",
  otherOut: "bg-violet-50 text-violet-700",
};

function rowHasActivity(row: StockReportRow) {
  return row.sold !== 0 || row.bonus !== 0 || row.additions !== 0 || row.removals !== 0 || row.otherIn !== 0 || row.otherOut !== 0;
}

/**
 * Individual Fiche de stock: one product, one branch, one period. Shows the
 * period totals, every operation (sale, truck, reception, transfer,
 * adjustment, correction) with the stock after it, and the day-by-day (or
 * month-by-month) balances. Every number comes verbatim from the same
 * authoritative stock ledger as the global report.
 */
export default function ProductStockSheet({ productId, productName, initialPeriod }: ProductStockSheetProps) {
  const online = useOnlineStatus();
  const [period, setPeriod] = useState<PeriodValue>(() => initialPeriod || defaultPeriod("day"));
  const [report, setReport] = useState<ProductStockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const [view, setView] = useState<"operations" | "days" | "documents">("operations");
  const [showQuietDays, setShowQuietDays] = useState(false);

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
  const transactions = useMemo(() => report?.transactions || [], [report]);
  const documents = useMemo(() => report?.documents || [], [report]);
  const documentsSummary = report?.documentsSummary;
  const documentsWithoutEffect = documents.filter((doc) => doc.status !== "counted").length;
  const rows = useMemo(() => {
    const all = report?.item.rows || [];
    return showQuietDays ? all : all.filter(rowHasActivity);
  }, [report, showQuietDays]);
  const monthly = report?.period.granularity === "month";
  const q = (value: number, signed = false) => formatCartonsPieces(value, ppc, { signed });
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
                    {q(item[card.key], card.signed)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{formatPieces(item[card.key])}</div>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="stock-detail-heading" className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="stock-detail-heading" className="text-sm font-bold text-slate-900">Détail de la période</h3>
              <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 text-sm" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "operations"}
                  onClick={() => setView("operations")}
                  className={`rounded-md px-3 py-1.5 font-semibold ${view === "operations" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  Opérations ({transactions.length.toLocaleString("fr-FR")})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "days"}
                  onClick={() => setView("days")}
                  className={`rounded-md px-3 py-1.5 font-semibold ${view === "days" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {monthly ? "Par mois" : "Par jour"}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "documents"}
                  onClick={() => setView("documents")}
                  className={`rounded-md px-3 py-1.5 font-semibold ${view === "documents" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  Documents ({documents.length.toLocaleString("fr-FR")})
                  {(documentsSummary?.mismatch ?? 0) > 0 && (
                    <span className="ml-1 rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white" aria-label={`${documentsSummary?.mismatch} écart(s)`}>
                      {documentsSummary?.mismatch}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {view === "operations" && (
              <>
                {report.transactionsTruncated && (
                  <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                    Seules les {transactions.length.toLocaleString("fr-FR")} premières opérations sont listées ; réduisez la période pour tout voir. Les totaux restent exacts.
                  </p>
                )}
                {transactions.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    <p>Aucune opération de stock sur cette période.</p>
                    {documents.length > 0 && (
                      <p className="mt-2">
                        Les historiques listent {documents.length.toLocaleString("fr-FR")} document{documents.length > 1 ? "s" : ""} pour cet article sur cette période
                        {documentsWithoutEffect > 0 ? " sans mouvement de stock" : ""}.{" "}
                        <button type="button" onClick={() => setView("documents")} className="font-semibold text-indigo-700 underline">
                          Voir pourquoi
                        </button>
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="app-data-scroll desktop-data-table max-h-[28rem] rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Opération</th>
                            <th className="px-3 py-2 text-right">Entrée</th>
                            <th className="px-3 py-2 text-right">Sortie</th>
                            <th className="px-3 py-2 text-right">Stock après</th>
                            <th className="px-3 py-2 text-left">Par</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-100 bg-slate-50">
                            <td className="px-3 py-2 text-slate-500" colSpan={4}>Stock initial au {formatDayFr(report.period.from)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{q(item.opening)}</td>
                            <td />
                          </tr>
                          {transactions.map((tx) => (
                            <tr key={tx.id} className={`border-t border-slate-100 ${tx.reversed ? "opacity-60" : ""}`}>
                              <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatDateTimeGmt2(tx.date)}</td>
                              <td className="px-3 py-2">
                                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${CATEGORY_TONE[tx.category]}`}>{tx.label}</span>
                                {tx.reversed && <span className="ml-1 text-xs text-slate-500">(annulé)</span>}
                                {tx.bonus > 0 && <span className="ml-1 text-xs text-amber-700">dont bonus {q(tx.bonus)}</span>}
                                <div className="mt-0.5 text-xs text-slate-500">{[tx.reference, tx.notes].filter(Boolean).join(" · ")}</div>
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-emerald-700">{tx.signed > 0 ? q(tx.signed) : ""}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-rose-700">{tx.signed < 0 ? q(-tx.signed) : ""}</td>
                              <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${tx.balanceAfter < 0 ? "text-red-700" : "text-slate-950"}`}>{q(tx.balanceAfter)}</td>
                              <td className="px-3 py-2 text-xs text-slate-500">{tx.recordedBy}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-slate-200 bg-slate-50">
                            <td className="px-3 py-2 font-semibold text-slate-700" colSpan={4}>Stock final au {formatDayFr(report.period.to)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-bold">{q(item.closing)}</td>
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mobile-record-list">
                      {transactions.map((tx) => (
                        <div key={tx.id} className={`rounded-xl border border-slate-200 bg-white p-3 text-sm ${tx.reversed ? "opacity-60" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${CATEGORY_TONE[tx.category]}`}>{tx.label}</span>
                            <span className={`whitespace-nowrap font-bold ${tx.signed > 0 ? "text-emerald-700" : "text-rose-700"}`}>{q(tx.signed, true)}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{formatDateTimeGmt2(tx.date)}{tx.recordedBy ? ` · ${tx.recordedBy}` : ""}</div>
                          {(tx.reference || tx.notes) && <div className="mt-0.5 break-words text-xs text-slate-500">{[tx.reference, tx.notes].filter(Boolean).join(" · ")}</div>}
                          <div className="mt-1 text-xs">Stock après : <strong>{q(tx.balanceAfter)}</strong></div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {view === "documents" && (
              <StockDocumentsPanel
                key={`${report.period.from}-${report.period.to}`}
                documents={documents}
                summary={documentsSummary}
                piecesPerCarton={ppc}
                truncated={report.documentsTruncated}
                error={report.documentsError}
              />
            )}

            {view === "days" && (
              <>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={showQuietDays} onChange={(event) => setShowQuietDays(event.target.checked)} />
                  Afficher aussi les {monthly ? "mois" : "jours"} sans mouvement
                </label>
                {rows.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-500">Aucun mouvement sur cette période.</p>
                ) : (
                  <div className="app-data-scroll max-h-[28rem] rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left">{monthly ? "Mois" : "Jour"}</th>
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
                        {rows.map((row) => (
                          <tr key={row.key} className="border-t border-slate-100">
                            <td className="whitespace-nowrap px-3 py-2 font-medium">{monthly ? formatMonthFr(row.key) : formatDayFr(row.key)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right">{q(row.opening)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-rose-700">{q(row.sold)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-amber-700">{q(row.bonus)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-emerald-700">{q(row.additions)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-orange-700">{q(row.removals)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-violet-700">{q(row.otherNet, true)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">{q(row.closing)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="stock-export-heading">
            <div>
              <h3 id="stock-export-heading" className="text-sm font-bold text-slate-900">Export de la fiche</h3>
              <p className="text-xs text-slate-500">Le PDF contient la synthèse et toutes les opérations de la période, avec le stock après chacune.</p>
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
