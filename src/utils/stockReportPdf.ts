import { downloadTableReportPdf, pdfFileStamp } from "./reportPdf";
import { formatCartonsPieces } from "./quantity";
import type { GlobalStockReport, ProductStockReport, StockReportItem } from "../types/stockReport";

// PDF renderings of the Fiche de stock. They print the backend numbers
// verbatim (services/stockLedger.js) — nothing is recomputed here.

function warningNotes(items: StockReportItem[]) {
  const notes: string[] = [];
  items.forEach((item) => {
    item.warnings.forEach((warning) => notes.push(`Attention - ${item.name} : ${warning.message}`));
  });
  return notes.slice(0, 20);
}

export function downloadGlobalStockPdf(report: GlobalStockReport, periodText: string) {
  const q = (item: StockReportItem, value: number, signed = false) => formatCartonsPieces(value, item.piecesPerCarton, { signed });
  return downloadTableReportPdf<StockReportItem>({
    title: "Fiche de stock globale",
    branchName: report.branch.name,
    periodLabel: periodText,
    orientation: "landscape",
    fileName: `fiche-stock-globale-${report.branch.id}-${pdfFileStamp(report.period.from, report.period.to)}`,
    recordLabel: ["article", "articles"],
    filters: [["Articles inclus", "articles ayant au moins une vente sur la période"]],
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
    totals: [["Articles vendus sur la période", String(report.items.length)]],
  });
}

export function downloadProductStockPdf(report: ProductStockReport, periodText: string) {
  const item = report.item;
  const q = (value: number, signed = false) => formatCartonsPieces(value, item.piecesPerCarton, { signed });
  return downloadTableReportPdf<StockReportItem>({
    title: `Fiche de stock - ${item.name}`,
    branchName: report.branch.name,
    periodLabel: periodText,
    orientation: "landscape",
    fileName: `fiche-stock-${item.name.replace(/[^\w-]+/g, "_").slice(0, 40)}-${pdfFileStamp(report.period.from, report.period.to)}`,
    recordLabel: ["synthèse", "synthèses"],
    filters: [
      ["Article", `${item.name}${item.status === "inactive" ? " (inactif)" : ""}`],
      ["Catégorie / Marque", `${item.category || "-"} / ${item.brand || "-"}`],
      ["Pièces par carton", String(item.piecesPerCarton)],
      ["Stock actuel", q(item.currentStock)],
    ],
    notes: item.warnings.map((warning) => `Attention : ${warning.message}`),
    columns: [
      { header: "Stock initial", width: 1.5, align: "right", value: (row) => q(row.opening) },
      { header: "Cartons et pièces vendus", width: 1.8, align: "right", value: (row) => q(row.sold) },
      { header: "Bonus", width: 1.2, align: "right", value: (row) => q(row.bonus) },
      { header: "Ajouts", width: 1.3, align: "right", value: (row) => q(row.additions) },
      { header: "Retraits", width: 1.3, align: "right", value: (row) => q(row.removals) },
      { header: "Autres mouvements", width: 1.5, align: "right", value: (row) => q(row.otherNet, true) },
      { header: "Stock final", width: 1.5, align: "right", value: (row) => q(row.closing) },
    ],
    rows: [item],
  });
}
