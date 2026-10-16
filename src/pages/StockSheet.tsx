import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, ClipboardList, ExternalLink, Loader2, RefreshCw, Search, WifiOff, X } from "lucide-react";
import PeriodSelector from "../components/reports/PeriodSelector";
import ExportPdfButton from "../components/reports/ExportPdfButton";
import ProductStockSheet from "../components/stock/ProductStockSheet";
import { fetchReport } from "../services/reportApi";
import { DATA_CHANGED_EVENT, getActiveBranchId } from "../services/dataSync";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { defaultPeriod, formatDayFr, periodLabel, stockReportParams, type PeriodValue } from "../utils/businessDate";
import { formatCartonsPieces } from "../utils/quantity";
import { downloadGlobalStockPdf } from "../utils/stockReportPdf";
import type { GlobalStockReport, GlobalStockScope, StockReportItem } from "../types/stockReport";

const SCOPE_OPTIONS: Array<{ value: GlobalStockScope; label: string; empty: string }> = [
  { value: "moved", label: "Articles avec mouvement", empty: "Aucun mouvement de stock sur cette période." },
  { value: "sold", label: "Articles vendus", empty: "Aucun article vendu sur cette période." },
  { value: "catalog", label: "Tous les articles", empty: "Aucun article." },
];

const STOCK_SCOPE_DESCRIPTIONS: Record<GlobalStockScope, string> = {
  moved: "articles ayant au moins un mouvement de stock sur la période (vente, camion, réception, transfert, ajustement, correction)",
  sold: "articles ayant au moins une vente sur la période",
  catalog: "tous les articles actifs (et les articles inactifs ayant bougé)",
};

/**
 * Fiche de stock globale — one summarized row per product
 * (GET /api/stock-reports/global): by default every product with ANY stock
 * movement in the period. Clicking a row opens that product's sheet with
 * every operation and the day-by-day balances, computed by the same backend
 * service.
 */
export default function StockSheet() {
  const online = useOnlineStatus();
  const [period, setPeriod] = useState<PeriodValue>(() => defaultPeriod("day"));
  const [report, setReport] = useState<GlobalStockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<GlobalStockScope>("moved");
  const [selected, setSelected] = useState<StockReportItem | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!navigator.onLine) return;
    const id = ++requestId.current;
    const branch = getActiveBranchId();
    setLoading(true);
    setError("");
    try {
      const data = await fetchReport<GlobalStockReport>("/stock-reports/global", { ...stockReportParams(period), scope });
      if (id !== requestId.current || branch !== getActiveBranchId()) return;
      setReport(data);
    } catch (loadError) {
      if (id !== requestId.current) return;
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger la fiche de stock globale");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [period, scope]);

  useEffect(() => {
    void load();
  }, [load, online]);

  useEffect(() => {
    const refresh = () => void load();
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(DATA_CHANGED_EVENT, refresh);
  }, [load]);

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = report?.items || [];
    return term ? all.filter((item) => `${item.name} ${item.category} ${item.brand}`.toLowerCase().includes(term)) : all;
  }, [report, search]);

  const warningCount = (report?.items || []).filter((item) => item.warnings.length > 0).length;
  const label = periodLabel(period);
  const emptyMessage = SCOPE_OPTIONS.find((option) => option.value === scope)?.empty || "Aucun article.";
  const q = (item: StockReportItem, value: number, signed = false) => formatCartonsPieces(value, item.piecesPerCarton, { signed });

  return (
    <div className="app-page">
      <div className="app-page-inner app-page-stack">
        <header className="app-page-header">
          <div>
            <h1 className="app-page-title flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                <ClipboardList className="h-6 w-6 text-indigo-700" />
              </span>
              Fiche de stock globale
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Stock initial, ventes, bonus, entrées et sorties de chaque article sur la période
              {report && <> — agence de <strong className="text-slate-700">{report.branch.name}</strong></>}.
            </p>
          </div>
          <div className="app-toolbar stock-sheet-actions">
            <button
              type="button"
              onClick={() => void load()}
              disabled={!online || loading}
              className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualiser
            </button>
            <ExportPdfButton
              className="min-w-0 px-2 sm:px-4"
              disabled={!report}
              onExport={async () => {
                if (!report) return 0;
                downloadGlobalStockPdf(report, label, STOCK_SCOPE_DESCRIPTIONS[report.scope || scope]);
                return report.items.length;
              }}
            />
          </div>
        </header>

        <PeriodSelector value={period} onChange={setPeriod} />

        {!online && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <WifiOff className="h-5 w-5" /> Connexion requise : ce rapport est calculé en direct par le serveur à partir du registre des mouvements de stock.
          </div>
        )}
        {error && <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {warningCount > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            {warningCount} article{warningCount > 1 ? "s présentent" : " présente"} un point de rapprochement à vérifier (marqués ⚠). Ouvrez la fiche de l'article pour le détail.
          </div>
        )}

        {report?.documentsError && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{report.documentsError} Les chiffres de la fiche restent exacts.</p>
        )}
        {report?.documentsSummary && report.documentsSummary.total > 0 && (
          <section
            className={`rounded-xl border p-3 text-sm ${report.documentsSummary.mismatch > 0 ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
            aria-label="Rapprochement avec les historiques"
          >
            <p className="font-semibold">
              Historiques de la période : {report.documentsSummary.total.toLocaleString("fr-FR")} ligne{report.documentsSummary.total > 1 ? "s" : ""} document × article —{" "}
              {report.documentsSummary.counted.toLocaleString("fr-FR")} comptée{report.documentsSummary.counted > 1 ? "s" : ""} dans la fiche,{" "}
              {report.documentsSummary.noEffect.toLocaleString("fr-FR")} sans impact sur le stock
              {report.documentsSummary.deleted > 0 && <>, {report.documentsSummary.deleted.toLocaleString("fr-FR")} supprimée{report.documentsSummary.deleted > 1 ? "s" : ""}</>}
              {report.documentsSummary.mismatch > 0
                ? <>, <strong>{report.documentsSummary.mismatch.toLocaleString("fr-FR")} écart{report.documentsSummary.mismatch > 1 ? "s" : ""}</strong>.</>
                : ". La fiche et les historiques concordent."}
            </p>
            {(report.mismatches?.length ?? 0) > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer font-semibold">Voir les écarts</summary>
                <ul className="mt-1 space-y-1 text-xs">
                  {report.mismatches!.slice(0, 100).map((doc) => (
                    <li key={`${doc.reference}-${doc.productId}`}>
                      <strong>{doc.day ? formatDayFr(doc.day) : "—"}</strong> · {doc.kindLabel} <span className="font-mono">{doc.reference}</span>
                      {doc.productName ? ` · ${doc.productName}` : ""} — {doc.message}
                    </li>
                  ))}
                  {report.mismatches!.length > 100 && <li>… {report.mismatches!.length - 100} autre(s) : ouvrez la fiche de l'article.</li>}
                </ul>
              </details>
            )}
            {(report.productsWithoutMovement?.length ?? 0) > 0 && (
              <details className="mt-2 text-slate-800">
                <summary className="cursor-pointer font-semibold">
                  {report.productsWithoutMovement!.length.toLocaleString("fr-FR")} article{report.productsWithoutMovement!.length > 1 ? "s" : ""} dans les historiques sans mouvement de stock (non listé{report.productsWithoutMovement!.length > 1 ? "s" : ""} ci-dessous)
                </summary>
                <ul className="mt-1 space-y-1 text-xs">
                  {report.productsWithoutMovement!.map((product) => (
                    <li key={product.productId}>
                      <strong>{product.name || product.productId}</strong> — {product.reasons.join(" · ")}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5 text-sm" role="radiogroup" aria-label="Articles affichés">
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={scope === option.value}
                onClick={() => setScope(option.value)}
                className={`rounded-md px-3 py-1.5 font-semibold ${scope === option.value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="relative block w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrer les articles affichés…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
            />
          </label>
          {report && (
            <span className="text-sm text-slate-600">
              {items.length.toLocaleString("fr-FR")} article{items.length > 1 ? "s" : ""}
              {items.length !== report.items.length && ` sur ${report.items.length.toLocaleString("fr-FR")}`} · {label}
            </span>
          )}
        </div>

        <div className="app-data-scroll desktop-data-table max-h-[calc(100dvh-var(--app-header-h,8rem)-15rem)] rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left">Produit</th>
                <th className="px-3 py-2.5 text-right">Stock initial</th>
                <th className="px-3 py-2.5 text-right">Cartons et pièces vendus</th>
                <th className="px-3 py-2.5 text-right">Bonus</th>
                <th className="px-3 py-2.5 text-right">Ajouts</th>
                <th className="px-3 py-2.5 text-right">Retraits</th>
                <th className="px-3 py-2.5 text-right">Autres mouvements</th>
                <th className="px-3 py-2.5 text-right">Stock final</th>
              </tr>
            </thead>
            <tbody>
              {loading && !report && (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Calcul de la fiche de stock…</td></tr>
              )}
              {report && items.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500">{emptyMessage}</td></tr>
              )}
              {items.map((item) => (
                <tr
                  key={item.productId}
                  onClick={() => setSelected(item)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-indigo-50/60"
                  title="Voir la fiche de stock de l'article"
                >
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-900">
                      {item.warnings.length > 0 && <span className="mr-1 text-amber-600" title={item.warnings.map((w) => w.message).join("\n")}>⚠</span>}
                      {item.name}
                      {item.status === "inactive" && <span className="ml-1 rounded bg-slate-200 px-1.5 text-xs font-normal">inactif</span>}
                    </div>
                    <div className="text-xs text-slate-500">{[item.category, item.brand].filter(Boolean).join(" · ")} · {item.piecesPerCarton} pcs/carton</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">{q(item, item.opening)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-rose-700">{q(item, item.sold)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-amber-700">{q(item, item.bonus)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-emerald-700">{q(item, item.additions)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-orange-700">{q(item, item.removals)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-violet-700">{q(item, item.otherNet, true)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-950">{q(item, item.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mobile-record-list" aria-live="polite">
          {loading && !report && (
            <div className="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
              <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Calcul de la fiche de stock…
            </div>
          )}
          {report && items.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500">{emptyMessage}</div>
          )}
          {items.map((item) => (
            <details key={item.productId} className="mobile-record-card group">
              <summary className="mobile-record-summary">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-slate-950">
                    {item.warnings.length > 0 && <span className="mr-1 text-amber-600" aria-label="Rapprochement à vérifier">⚠</span>}
                    {item.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{[item.category, item.brand].filter(Boolean).join(" · ") || `${item.piecesPerCarton} pcs/carton`}</span>
                </span>
                <span className="flex items-center gap-2 text-right">
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Stock final</span>
                    <span className="block text-sm font-black text-slate-950">{q(item, item.closing)}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                </span>
              </summary>
              <div className="mobile-record-detail">
                <dl className="mobile-record-grid">
                  <div className="mobile-record-metric"><dt>Stock initial</dt><dd>{q(item, item.opening)}</dd></div>
                  <div className="mobile-record-metric"><dt>Vendus</dt><dd className="text-rose-700">{q(item, item.sold)}</dd></div>
                  <div className="mobile-record-metric"><dt>Bonus</dt><dd className="text-amber-700">{q(item, item.bonus)}</dd></div>
                  <div className="mobile-record-metric"><dt>Ajouts</dt><dd className="text-emerald-700">{q(item, item.additions)}</dd></div>
                  <div className="mobile-record-metric"><dt>Retraits</dt><dd className="text-orange-700">{q(item, item.removals)}</dd></div>
                  <div className="mobile-record-metric"><dt>Autres</dt><dd className="text-violet-700">{q(item, item.otherNet, true)}</dd></div>
                </dl>
                <button type="button" onClick={() => setSelected(item)} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">
                  <ExternalLink className="h-4 w-4" /> Voir la fiche de stock
                </button>
              </div>
            </details>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          Ventes et bonus sont des sorties de stock. Ajouts : stock initial, arrivées de camion, réceptions, ajustements manuels (+).
          Retraits : transferts livrés, prêts, ajustements manuels (−). Une correction ou une annulation est déduite de la colonne
          de l'opération corrigée, à la date de cette opération (comme dans l'historique des ventes et les rapports).
          Stock final = stock initial + entrées − sorties.
        </p>
      </div>

      {selected && (
        <div className="app-dialog-overlay" role="dialog" aria-modal="true" aria-label={`Fiche de stock — ${selected.name}`}>
          <div className="app-dialog-panel max-w-6xl">
            <div className="app-dialog-header">
              <h2 className="text-lg font-bold text-slate-900">Fiche de stock — {selected.name}</h2>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <ProductStockSheet productId={selected.productId} productName={selected.name} initialPeriod={period} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
