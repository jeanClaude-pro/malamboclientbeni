import { MinusCircle } from "lucide-react";
import type { StockImpact } from "../../types/stockReport";

/**
 * Shown on a history row (truck, transfer, reception) that does NOT move
 * stock — the Fiche de stock does not count it. The rule and the reason come
 * from the server (services/operationRules.js), the same as the fiche's
 * "Documents" tab.
 */
export default function StockImpactBadge({ impact, compact = false }: { impact?: StockImpact; compact?: boolean }) {
  if (!impact || impact.affectsStock) return null;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 ${compact ? "text-[10px]" : "text-[11px]"}`}
      title={impact.reason}
    >
      <MinusCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">Sans impact sur le stock</span>
      <span className="sr-only"> : {impact.reason}</span>
    </span>
  );
}
