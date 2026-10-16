// Clôture journalière (superadmin only).
//
// Closing a day freezes its totals (snapshot) and locks it: afterwards only
// the superadmin can still record or correct operations dated on that day,
// and each such change is listed in that day's history. The page shows the
// declared snapshot next to the figures recomputed now, so any later
// correction is visible as a difference — never silently overwritten.
import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Lock, LockOpen, RefreshCw } from "lucide-react";
import { getActiveBranchId } from "../services/dataSync";
import { addDays, formatDayFr, todayYMD } from "../utils/businessDate";

const API_BASE = import.meta.env.VITE_API_URL;

interface Amount { amount: number; count: number }
interface DayCash {
  cashSales: Amount;
  creditReceipts: Amount;
  refunds: Amount;
  entries: Amount;
  expenses: Amount;
  salesRevenue: number;
  netAmount: number;
  openingBalance: number;
  closingBalance: number;
  carriedFrom?: string | null;
}
interface DayTotals {
  businessDate: string;
  calculationVersion: number;
  cash: DayCash;
  credit: { invoiced: Amount };
  voidedSalesCount: number;
}
interface HistoryLine { action: string; at: string; by: string; reason?: string; reference?: string }
interface ClosingDoc {
  status: "closed" | "reopened";
  closedAt?: string;
  closedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  snapshot: DayTotals;
  notes?: string;
  history: HistoryLine[];
}
interface CarryOver {
  fromDate: string | null;
  opening: number;
  declaredClosing?: number;
  difference?: number;
  previousClosed?: boolean;
  ok: boolean;
}
interface DayDetail {
  carryOver?: CarryOver;
  businessDate: string;
  status: "open" | "closed" | "reopened";
  closing: ClosingDoc | null;
  current: DayTotals;
  differences: { field: string; atClosing: number; now: number; difference: number }[];
}
interface ListRow {
  businessDate: string;
  status: "closed" | "reopened";
  closedBy?: string;
  closedAt?: string;
  cash?: DayCash;
  overrides: number;
}

const money = (n: number | undefined) =>
  `${(Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

const FIELD_LABELS: Record<string, string> = {
  "cash.cashSales.amount": "Ventes au comptant",
  "cash.creditReceipts.amount": "Paiements de crédits reçus",
  "cash.refunds.amount": "Remboursements",
  "cash.entries.amount": "Entrées de caisse",
  "cash.expenses.amount": "Sorties validées",
  "cash.netAmount": "Résultat du jour",
  "cash.openingBalance": "Solde d'ouverture",
  "cash.closingBalance": "Solde de clôture",
  "credit.invoiced.amount": "Crédits facturés",
  "voidedSalesCount": "Ventes annulées (nombre)",
};

const ACTION_LABELS: Record<string, string> = {
  close: "Clôture",
  reopen: "Réouverture",
  reclose: "Nouvelle clôture",
};

function actionLabel(action: string) {
  if (action.startsWith("override:")) return `Correction superadmin (${action.slice(9)})`;
  return ACTION_LABELS[action] || action;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || body.message || `Erreur ${res.status}`), { code: body.code as string | undefined });
  return body as T;
}

function TotalsTable({ totals, title }: { totals: DayTotals; title: string }) {
  const c = totals.cash;
  const rows: [string, number, number?][] = [
    ["Ventes au comptant", c.cashSales.amount, c.cashSales.count],
    ["Paiements de crédits reçus", c.creditReceipts.amount, c.creditReceipts.count],
    ["Remboursements (ventes annulées)", -c.refunds.amount, c.refunds.count],
    ["Entrées de caisse", c.entries.amount, c.entries.count],
    ["Sorties validées", -c.expenses.amount, c.expenses.count],
  ];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold text-slate-700">{title}</h3>
      <div className="app-data-scroll">
      <table className="w-full min-w-[28rem] text-sm">
        <tbody>
          <tr className="text-slate-500">
            <td className="py-1">
              Solde d'ouverture
              {c.carriedFrom && <span className="text-xs text-slate-400"> (reporté du {formatDayFr(c.carriedFrom)})</span>}
            </td>
            <td className="py-1 text-right">{money(c.openingBalance)}</td>
          </tr>
          {rows.map(([label, amount, count]) => (
            <tr key={label} className="border-t border-slate-100">
              <td className="py-1">{label} <span className="text-xs text-slate-400">({count ?? 0})</span></td>
              <td className={`py-1 text-right ${amount < 0 ? "text-red-600" : ""}`}>{money(amount)}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-300 font-semibold">
            <td className="py-1">Résultat du jour</td>
            <td className="py-1 text-right">{money(c.netAmount)}</td>
          </tr>
          <tr className="font-bold">
            <td className="py-1">Solde de clôture</td>
            <td className="py-1 text-right">{money(c.closingBalance)}</td>
          </tr>
          <tr className="border-t border-slate-100 text-slate-500">
            <td className="py-1">Crédits facturés (non encaissés)</td>
            <td className="py-1 text-right">{money(totals.credit.invoiced.amount)}</td>
          </tr>
          <tr className="text-slate-500">
            <td className="py-1">Ventes annulées ce jour</td>
            <td className="py-1 text-right">{totals.voidedSalesCount}</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
}

export default function DailyClosing() {
  const [date, setDate] = useState(todayYMD());
  const [detail, setDetail] = useState<DayDetail | null>(null);
  const [list, setList] = useState<ListRow[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const branch = getActiveBranchId();
    setLoading(true);
    setError(null);
    try {
      const [d, l] = await Promise.all([
        api<DayDetail>(`/daily-closings/${date}`),
        api<{ closings: ListRow[] }>(`/daily-closings?from=${addDays(date, -45)}&to=${addDays(date, 45)}`),
      ]);
      if (getActiveBranchId() !== branch) return; // branch changed mid-flight
      setDetail(d);
      setList(l.closings);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const close = async () => {
    if (!window.confirm(`Clôturer la journée du ${formatDayFr(date)} ? Seul le superadmin pourra encore modifier ses opérations.`)) return;
    const send = (extra: Record<string, unknown> = {}) =>
      api(`/daily-closings/${date}/close`, { method: "POST", body: JSON.stringify({ notes, ...extra }) });
    try {
      setLoading(true);
      setError(null);
      try {
        await send();
      } catch (e) {
        if ((e as { code?: string }).code !== "CARRY_OVER_DIFFERENCE") throw e;
        // The previous closed day was corrected after its closing: the
        // superadmin must explain why the carried-over amount differs.
        const reason = window.prompt(`${(e as Error).message}\n\nExplication :`);
        if (reason === null || !reason.trim()) throw new Error("Clôture annulée : une explication de l'écart de report est requise");
        await send({ acceptCarryOverDifference: true, carryOverReason: reason.trim() });
      }
      setMessage(`✅ Journée du ${formatDayFr(date)} clôturée`);
      setNotes("");
      await load();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  const reopen = async () => {
    const reason = window.prompt(`Rouvrir la journée du ${formatDayFr(date)} ? Raison :`);
    if (reason === null) return;
    if (!reason.trim()) {
      setError("Une raison de réouverture est requise");
      return;
    }
    try {
      setLoading(true);
      await api(`/daily-closings/${date}/reopen`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) });
      setMessage(`Journée du ${formatDayFr(date)} rouverte`);
      await load();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  const isFuture = date > todayYMD();
  const status = detail?.status || "open";

  return (
    <div className="app-page mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <CalendarCheck className="h-6 w-6 text-blue-600" /> Clôture journalière
        </h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <button type="button" onClick={() => setDate(addDays(date, -1))} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">←</button>
          <input type="date" value={date} max={todayYMD()} onChange={(e) => e.target.value && setDate(e.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm sm:flex-none" />
          <button type="button" onClick={() => setDate(addDays(date, 1))} disabled={date >= todayYMD()} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40">→</button>
          <button type="button" onClick={() => void load()} className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50" title="Actualiser">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <div className="text-lg font-semibold">{formatDayFr(date)}</div>
          <div className="text-sm text-slate-600">
            {status === "closed" && (
              <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                <Lock className="h-4 w-4" /> Clôturée par {detail?.closing?.closedBy} le {detail?.closing?.closedAt ? new Date(detail.closing.closedAt).toLocaleString("fr-FR") : ""}
              </span>
            )}
            {status === "reopened" && (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                <LockOpen className="h-4 w-4" /> Rouverte par {detail?.closing?.reopenedBy}
              </span>
            )}
            {status === "open" && <span>Journée ouverte — non clôturée</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status !== "closed" && (
            <>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note de clôture (facultatif)" className="w-full rounded-lg border px-3 py-2 text-sm sm:w-64" />
              <button type="button" onClick={() => void close()} disabled={loading || isFuture} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                <Lock className="h-4 w-4" /> Clôturer la journée
              </button>
            </>
          )}
          {status === "closed" && (
            <button type="button" onClick={() => void reopen()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">
              <LockOpen className="h-4 w-4" /> Rouvrir
            </button>
          )}
        </div>
      </div>

      {detail?.carryOver?.fromDate && status !== "closed" && (
        <div className={`mb-4 rounded-xl border p-3 text-sm ${detail.carryOver.ok ? "border-slate-200 bg-white text-slate-700" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
          Report du {formatDayFr(detail.carryOver.fromDate)} : <strong>{money(detail.carryOver.opening)}</strong>
          {detail.carryOver.previousClosed === false && !detail.carryOver.ok && " — clôturez d'abord cette journée."}
          {detail.carryOver.previousClosed && !detail.carryOver.ok &&
            ` — déclaré à sa clôture : ${money(detail.carryOver.declaredClosing)} (écart ${money(detail.carryOver.difference)}). Une explication sera demandée.`}
        </div>
      )}

      {detail && (
        <div className="grid gap-4 md:grid-cols-2">
          {detail.closing && <TotalsTable totals={detail.closing.snapshot} title="Déclaré à la clôture (figé)" />}
          <TotalsTable totals={detail.current} title={detail.closing ? "Recalculé maintenant depuis les documents" : "Totaux du jour (recalculés)"} />
        </div>
      )}

      {detail?.closing && (
        <div className={`mt-4 rounded-xl border p-4 text-sm ${detail.differences.length ? "border-amber-300 bg-amber-50" : "border-green-200 bg-green-50"}`}>
          {detail.differences.length === 0 ? (
            <span className="font-semibold text-green-700">✅ Les documents correspondent exactement aux totaux déclarés à la clôture.</span>
          ) : (
            <>
              <div className="mb-2 font-semibold text-amber-800">Écarts depuis la clôture (corrections postérieures ou nouvelle règle de calcul) :</div>
              <ul className="list-disc pl-5">
                {detail.differences.map((d) => (
                  <li key={d.field}>
                    {FIELD_LABELS[d.field] || d.field} : {d.field.endsWith(".count") || d.field === "voidedSalesCount" ? `${d.atClosing} → ${d.now}` : `${money(d.atClosing)} → ${money(d.now)} (${d.difference > 0 ? "+" : ""}${money(d.difference)})`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {detail?.closing && detail.closing.history.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-bold text-slate-700">Historique de la journée</h3>
          <div className="app-data-scroll">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-1">Quand</th><th>Action</th><th>Par</th><th>Référence</th><th>Raison</th></tr>
            </thead>
            <tbody>
              {detail.closing.history.map((h, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1">{new Date(h.at).toLocaleString("fr-FR")}</td>
                  <td>{actionLabel(h.action)}</td>
                  <td>{h.by}</td>
                  <td>{h.reference || "—"}</td>
                  <td>{h.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-bold text-slate-700">Clôtures autour de cette date</h3>
        {list.length === 0 ? (
          <div className="text-sm text-slate-500">Aucune journée clôturée sur cette période.</div>
        ) : (
          <div className="app-data-scroll">
          <table className="w-full min-w-[38rem] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-1">Jour</th><th>Statut</th><th>Par</th><th className="text-right">Solde de clôture</th><th className="text-right">Corrections</th></tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.businessDate} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" onClick={() => setDate(row.businessDate)}>
                  <td className="py-1">{formatDayFr(row.businessDate)}</td>
                  <td>{row.status === "closed" ? "Clôturée" : "Rouverte"}</td>
                  <td>{row.closedBy}</td>
                  <td className="text-right">{money(row.cash?.closingBalance)}</td>
                  <td className="text-right">{row.overrides}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
