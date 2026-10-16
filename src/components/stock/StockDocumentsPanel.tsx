import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, MinusCircle, Trash2 } from "lucide-react";
import { formatDayFr } from "../../utils/businessDate";
import { formatCartonsPieces } from "../../utils/quantity";
import type { StockDocument, StockDocumentStatus, StockDocumentsSummary } from "../../types/stockReport";

const DOCUMENT_STATUS: Record<StockDocumentStatus, { label: string; tone: string; Icon: typeof CheckCircle2 }> = {
  counted: { label: "Compté", tone: "bg-emerald-50 text-emerald-800 border-emerald-200", Icon: CheckCircle2 },
  no_effect: { label: "Sans impact sur le stock", tone: "bg-slate-100 text-slate-700 border-slate-200", Icon: MinusCircle },
  mismatch: { label: "Écart", tone: "bg-red-50 text-red-800 border-red-200", Icon: AlertTriangle },
  deleted: { label: "Document supprimé", tone: "bg-violet-50 text-violet-800 border-violet-200", Icon: Trash2 },
};

type Filter = "all" | StockDocumentStatus;

interface StockDocumentsPanelProps {
  documents: StockDocument[];
  summary?: StockDocumentsSummary | null;
  piecesPerCarton: number;
  truncated?: string[];
  error?: string;
}

export function DocumentStatusBadge({ status }: { status: StockDocumentStatus }) {
  const { label, tone, Icon } = DOCUMENT_STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
    </span>
  );
}

/**
 * Documents of the period (sales, trucks, transfers, receptions) exactly as
 * their history screens list them, each matched with its stock movements by
 * the server: counted, without stock effect (with the reason), mismatch, or
 * deleted. Explains every difference between the fiche and the histories.
 */
export default function StockDocumentsPanel({ documents, summary, piecesPerCarton, truncated = [], error }: StockDocumentsPanelProps) {
  const [filter, setFilter] = useState<Filter>(() => (summary && summary.mismatch > 0 ? "mismatch" : "all"));
  const visible = useMemo(() => (filter === "all" ? documents : documents.filter((doc) => doc.status === filter)), [documents, filter]);
  const q = (value: number | null) => (value === null ? "?" : formatCartonsPieces(value, piecesPerCarton, { signed: true }));
  const counts: Record<Filter, number> = {
    all: documents.length,
    counted: summary?.counted ?? 0,
    no_effect: summary?.noEffect ?? 0,
    mismatch: summary?.mismatch ?? 0,
    deleted: summary?.deleted ?? 0,
  };
  const filters: Array<{ value: Filter; label: string }> = [
    { value: "all", label: "Tous" },
    { value: "counted", label: "Comptés" },
    { value: "no_effect", label: "Sans impact" },
    { value: "mismatch", label: "Écarts" },
    { value: "deleted", label: "Supprimés" },
  ];

  if (error) {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error} Les chiffres de la fiche restent exacts ; actualisez pour réessayer.</p>;
  }

  if (documents.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        Aucun document dans les historiques (ventes, camions, transferts, réceptions) pour cet article sur cette période.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Les mêmes documents que les historiques des ventes, des camions, des transferts et des réceptions pour cette période,
        chacun rapproché de ses mouvements de stock.
      </p>
      {truncated.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
          Trop de documents sur cette période : réduisez la période pour un contrôle complet.
        </p>
      )}
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filtrer les documents">
        {filters.filter((option) => option.value === "all" || counts[option.value] > 0).map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === option.value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"} ${option.value === "mismatch" && filter !== option.value ? "text-red-700" : ""}`}
          >
            {option.label} ({counts[option.value].toLocaleString("fr-FR")})
          </button>
        ))}
      </div>

      <div className="app-data-scroll desktop-data-table max-h-[28rem] rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left">Jour</th>
              <th className="px-3 py-2 text-left">Document</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="px-3 py-2 text-right">Selon le document</th>
              <th className="px-3 py-2 text-right">Dans la fiche</th>
              <th className="px-3 py-2 text-left">Rapprochement</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((doc) => (
              <tr key={`${doc.reference}-${doc.productId}`} className={`border-t border-slate-100 align-top ${doc.status === "mismatch" ? "bg-red-50/40" : ""}`}>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{doc.day ? formatDayFr(doc.day) : "—"}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-900">{doc.kindLabel} <span className="font-mono text-xs font-normal text-slate-500">{doc.reference}</span></div>
                  <div className="text-xs text-slate-500">{doc.history || "Absent des historiques"}{doc.view === "voided" ? " (filtre « Annulées »)" : ""}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{doc.docStatusLabel || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{doc.status === "deleted" ? "—" : q(doc.expected)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">{q(doc.inPeriod)}</td>
                <td className="px-3 py-2">
                  <DocumentStatusBadge status={doc.status} />
                  {(doc.reason || doc.message) && <div className={`mt-1 text-xs ${doc.status === "mismatch" ? "text-red-800" : "text-slate-500"}`}>{doc.message || doc.reason}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-record-list">
        {visible.map((doc) => (
          <div key={`${doc.reference}-${doc.productId}`} className={`rounded-xl border bg-white p-3 text-sm ${doc.status === "mismatch" ? "border-red-200" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{doc.kindLabel}</div>
                <div className="break-all font-mono text-xs text-slate-500">{doc.reference}</div>
              </div>
              <DocumentStatusBadge status={doc.status} />
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {doc.day ? formatDayFr(doc.day) : "—"}{doc.docStatusLabel ? ` · ${doc.docStatusLabel}` : ""}
            </div>
            {doc.status !== "deleted" && (
              <div className="mt-1 text-xs">Document : <strong>{q(doc.expected)}</strong> · Fiche : <strong>{q(doc.inPeriod)}</strong></div>
            )}
            {(doc.reason || doc.message) && <div className={`mt-1 text-xs ${doc.status === "mismatch" ? "text-red-800" : "text-slate-500"}`}>{doc.message || doc.reason}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
