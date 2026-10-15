import { downloadTableReportPdf, pdfFileStamp } from "./reportPdf";
import { formatCartonsPieces } from "./quantity";
import { formatDateTimeGmt2 } from "./time";
import { formatDayFr } from "./businessDate";
import type { GlobalStockReport, ProductStockReport, StockReportItem, StockTransaction } from "../types/stockReport";

// PDF renderings of the Fiche de stock. They print the backend numbers
// verbatim (services/stockLedger.js) — nothing is recomputed here.

function warningNotes(items: StockReportItem[]) {
  const notes: string[] = [];
  items.forEach((item) => {
    item.warnings.forEach((warning) => notes.push(`Attention - ${item.name} : ${warning.message}`));
  });
  return notes.slice(0, 20);
}

export function downloadGlobalStockPdf(report: GlobalStockReport, periodText: string, scopeText = "articles ayant au moins un mouvement de stock sur la période") {
  const q = (item: StockReportItem, value: number, signed = false) => formatCartonsPieces(value, item.piecesPerCarton, { signed });
  return downloadTableReportPdf<StockReportItem>({
    title: "Fiche de stock globale",
    branchName: report.branch.name,
    periodLabel: periodText,
    orientation: "landscape",
    fileName: `fiche-stock-globale-${report.branch.id}-${pdfFileStamp(report.period.from, report.period.to)}`,
    recordLabel: ["article", "articles"],
    filters: [["Articles inclus", scopeText]],
    notes: [
      "Quantités en cartons + pièces (taille de carton propre à chaque article). Stock final = stock initial + entrées - sorties ; ventes et bonus sont des sorties.",
      ...warningNotes(report.items),
    ],
    columns: [
      { header: "Produit", width: 2.6, value: (item) => `${item.name}${item.status === "inactive" ? " (inactif)" : ""}` },
      { header: "Stock initial", width: 1.5, align: "right", value: (item) => q(item, item.opening) },
      { header: "Cartons et pièces vendus", width: 1.6, align: "right", value: (item) => q(item, item.sold) },
      { header: "Bonus", width: 1.3, align: "right", value: (item) => q(item, item.bonus) },
      { header: "Ajouts", width: 1.4, align: "right", value: (item) => q(item, item.additions) },
      { header: "Retraits", width: 1.4, align: "right", value: (item) => q(item, item.removals) },
      { header: "Autres mouvements", width: 1.5, align: "right", value: (item) => q(item, item.otherNet, true) },
      { header: "Stock final", width: 1.5, align: "right", value: (item) => q(item, item.closing) },
    ],
    rows: report.items,
    totals: [["Articles", String(report.items.length)]],
  });
}

// One opening line, one line per operation, one closing line.
type ProductPdfRow =
  | { kind: "edge"; label: string; balance: number }
  | { kind: "tx"; tx: StockTransaction };

export function downloadProductStockPdf(report: ProductStockReport, periodText: string) {
  const item = report.item;
  const q = (value: number, signed = false) => formatCartonsPieces(value, item.piecesPerCarton, { signed });
  const transactions = report.transactions || [];
  const rows: ProductPdfRow[] = [
    { kind: "edge", label: `Stock initial au ${formatDayFr(report.period.from)}`, balance: item.opening },
    ...transactions.map((tx) => ({ kind: "tx" as const, tx })),
    { kind: "edge", label: `Stock final au ${formatDayFr(report.period.to)}`, balance: item.closing },
  ];
  return downloadTableReportPdf<ProductPdfRow>({
    title: `Fiche de stock - ${item.name}`,
    branchName: report.branch.name,
    periodLabel: periodText,
    orientation: "landscape",
    fileName: `fiche-stock-${item.name.replace(/[^\w-]+/g, "_").slice(0, 40)}-${pdfFileStamp(report.period.from, report.period.to)}`,
    recordLabel: ["ligne", "lignes"],
    filters: [
      ["Article", `${item.name}${item.status === "inactive" ? " (inactif)" : ""}`],
      ["Catégorie / Marque", `${item.category || "-"} / ${item.brand || "-"}`],
      ["Pièces par carton", String(item.piecesPerCarton)],
      ["Stock actuel", q(item.currentStock)],
    ],
    notes: [
      ...item.warnings.map((warning) => `Attention : ${warning.message}`),
      ...(report.transactionsTruncated ? ["Liste des opérations tronquée : réduisez la période pour tout imprimer (les totaux restent exacts)."] : []),
    ],
    columns: [
      { header: "Date", width: 1.3, value: (row) => (row.kind === "tx" ? formatDateTimeGmt2(row.tx.date) : "") },
      {
        header: "Opération",
        width: 3,
        value: (row) => {
          if (row.kind === "edge") return row.label;
          const { tx } = row;
          const details = [tx.reference, tx.notes].filter(Boolean).join(" - ");
          const bonus = tx.bonus > 0 ? ` (dont bonus ${q(tx.bonus)})` : "";
          return `${tx.label}${tx.reversed ? " (annulé)" : ""}${bonus}${details ? ` - ${details}` : ""}`;
        },
      },
      { header: "Entrée", width: 1.4, align: "right", value: (row) => (row.kind === "tx" && row.tx.signed > 0 ? q(row.tx.signed) : "") },
      { header: "Sortie", width: 1.4, align: "right", value: (row) => (row.kind === "tx" && row.tx.signed < 0 ? q(-row.tx.signed) : "") },
      { header: "Stock après", width: 1.5, align: "right", value: (row) => q(row.kind === "tx" ? row.tx.balanceAfter : row.balance) },
      { header: "Par", width: 1, value: (row) => (row.kind === "tx" ? row.tx.recordedBy : "") },
    ],
    rows,
    totals: [
      ["Stock initial", q(item.opening)],
      ["Cartons et pièces vendus", q(item.sold)],
      ["Bonus", q(item.bonus)],
      ["Ajouts", q(item.additions)],
      ["Retraits", q(item.removals)],
      ["Autres mouvements", q(item.otherNet, true)],
      ["Stock final", q(item.closing)],
    ],
  });
}
