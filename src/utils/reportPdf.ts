import jsPDF from "jspdf";
import { formatDateTimeGmt2 } from "./time";
import { paginateRecords, RECORDS_PER_PDF_PAGE } from "./reportPagination";

// Shared PDF layout for every Suivi & rapports export.
//
// - Page 1 starts with the report header (company, title, branch, period,
//   generation time, applied filters, number of exported records) and the
//   "Synthèse" totals block.
// - Records are grouped in logical pages of at most 50 (RECORDS_PER_PDF_PAGE);
//   every logical page starts on a new physical page with the column headings.
// - Cells are wrapped, never clipped. If a logical page's rows are too tall to
//   fit one physical page (long wrapped text), the remaining rows continue on
//   an extra physical page marked "(suite)" with the headings repeated — no
//   record is ever dropped to keep the 50-row target.
// - Every page carries "Page x / n" and the record range it contains.

export const COMPANY_NAME = "Entre Nous Renove";

export interface PdfColumn<T> {
  header: string;
  /** Relative width; columns share the printable width proportionally. */
  width: number;
  align?: "left" | "right" | "center";
  value: (row: T, index: number) => string;
}

export interface TableReportOptions<T> {
  title: string;
  branchName: string;
  periodLabel: string;
  columns: PdfColumn<T>[];
  rows: T[];
  fileName: string;
  orientation?: "portrait" | "landscape";
  /** Applied filters, shown in the header ([label, value]). */
  filters?: Array<[string, string]>;
  /** Totals block printed after the last record ([label, value]). */
  totals?: Array<[string, string]>;
  /** Free-text notes/warnings printed under the header. */
  notes?: string[];
  generatedBy?: string;
  recordsPerPage?: number;
  /** Label used in "N enregistrement(s)" (default "enregistrement"). */
  recordLabel?: [singular: string, plural: string];
}

const MARGIN = 10;
const FOOTER_SPACE = 12;
const HEADER_ROW_HEIGHT = 6.5;
const MIN_FIRST_PAGE_ROW_HEIGHT = 3;

// The built-in PDF fonts only cover WinAnsi; fr-FR number formatting uses
// narrow no-break spaces and some UI strings use typographic symbols.
export function pdfText(value: unknown) {
  return String(value ?? "")
    .replace(/[\u202f\u00a0]/g, " ")
    .replace(/[\u2212\u2012\u2013\u2014]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...");
}

export function formatMoneyPdf(value: number, currency = "$") {
  const amount = Number(value || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return pdfText(`${amount} ${currency}`.trim());
}

interface PageInfo {
  logical: number;
  first: number;
  last: number;
  continuation: boolean;
}

export function buildTableReportPdf<T>(options: TableReportOptions<T>) {
  const orientation = options.orientation || "portrait";
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const bottom = pageH - FOOTER_SPACE;
  const perPage = options.recordsPerPage || RECORDS_PER_PDF_PAGE;
  const [singular, plural] = options.recordLabel || ["enregistrement", "enregistrements"];
  const recordCount = options.rows.length;

  // Base row height so a page of 50 single-line rows fits a continuation page.
  const usable = bottom - (MARGIN + 9) - HEADER_ROW_HEIGHT;
  const baseRowHeight = Math.max(3.2, Math.min(5.2, Math.floor((usable / perPage) * 100) / 100));
  const fontSize = baseRowHeight >= 4.6 ? 7.5 : baseRowHeight >= 3.8 ? 7 : 6.4;
  const lineHeight = fontSize * 0.36;

  const totalWeight = options.columns.reduce((sum, column) => sum + column.width, 0);
  const widths = options.columns.map((column) => (column.width / totalWeight) * contentW);
  const pageInfos: Array<PageInfo | null> = [];

  const drawRunningHeader = (continuation: boolean) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfText(`${COMPANY_NAME} - ${options.title}${continuation ? " (suite)" : ""}`), MARGIN, MARGIN + 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(pdfText(`Agence : ${options.branchName}  |  ${options.periodLabel}`), pageW - MARGIN, MARGIN + 3, { align: "right" });
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGIN, MARGIN + 5.5, pageW - MARGIN, MARGIN + 5.5);
    return MARGIN + 9;
  };

  const drawColumnHeader = (y: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(MARGIN, y, contentW, HEADER_ROW_HEIGHT, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(255, 255, 255);
    let x = MARGIN;
    options.columns.forEach((column, index) => {
      const lines = doc.splitTextToSize(pdfText(column.header), widths[index] - 2);
      const textX = column.align === "right" ? x + widths[index] - 1 : column.align === "center" ? x + widths[index] / 2 : x + 1;
      doc.text(lines[0] ?? "", textX, y + 4.2, { align: column.align || "left" });
      x += widths[index];
    });
    return y + HEADER_ROW_HEIGHT;
  };

  const newPage = (info: PageInfo | null) => {
    doc.addPage();
    pageInfos.push(info);
    return drawRunningHeader(Boolean(info?.continuation));
  };

  // ---------------- Page 1: report header ----------------
  pageInfos.push(null);
  let y = MARGIN + 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(COMPANY_NAME, MARGIN, y + 2);
  doc.setFontSize(12);
  doc.text(pdfText(options.title), MARGIN, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const meta: Array<[string, string]> = [
    ["Agence", options.branchName],
    ["Période", options.periodLabel],
    ["Généré le", `${formatDateTimeGmt2(new Date())} (GMT+2)${options.generatedBy ? ` par ${options.generatedBy}` : ""}`],
    ["Enregistrements exportés", `${recordCount.toLocaleString("fr-FR")} ${recordCount > 1 ? plural : singular}`],
    ...(options.filters || []),
  ];
  y += 15;
  meta.forEach(([label, value]) => {
    const lines = doc.splitTextToSize(pdfText(`${label} : ${value}`), contentW);
    doc.text(lines, MARGIN, y);
    y += lines.length * 3.8;
  });
  (options.notes || []).forEach((note) => {
    doc.setTextColor(146, 64, 14);
    const lines = doc.splitTextToSize(pdfText(note), contentW);
    doc.text(lines, MARGIN, y);
    y += lines.length * 3.8;
  });
  doc.setTextColor(51, 65, 85);

  // Summary ("Synthèse") right under the header, so page 1 always carries the
  // report's totals even when the first group of records starts on page 2.
  if (options.totals && options.totals.length > 0) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Synthèse", MARGIN, y + 1);
    y += 5;
    const columnWidth = contentW / 2;
    options.totals.forEach(([label, value], index) => {
      const x = MARGIN + (index % 2) * columnWidth;
      if (index % 2 === 0 && index > 0) y += 4.4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const labelText = pdfText(`${label} :`);
      doc.text(labelText, x, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(pdfText(value), x + columnWidth - 6, y, { align: "right" });
    });
    y += 4.4;
  }
  y += 2;
  doc.setDrawColor(203, 213, 225);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 3;

  // ---------------- Records ----------------
  const logicalPages = paginateRecords(options.rows, perPage);
  if (logicalPages.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("Aucun enregistrement pour la période et les filtres sélectionnés.", MARGIN, y + 5);
    y += 10;
  }

  logicalPages.forEach((logical, logicalIndex) => {
    // The first logical page may share page 1 with the header when all of its
    // rows fit there, if needed with slightly tighter (still legible, >= 3 mm)
    // rows; otherwise it starts a fresh page like every other group.
    let rowHeightForPage = baseRowHeight;
    const roomOnFirstPage = (bottom - y - HEADER_ROW_HEIGHT) / logical.records.length;
    if (logicalIndex === 0 && roomOnFirstPage >= MIN_FIRST_PAGE_ROW_HEIGHT) {
      rowHeightForPage = Math.min(baseRowHeight, roomOnFirstPage);
      pageInfos[0] = { logical: logical.index, first: logical.firstRecord, last: logical.lastRecord, continuation: false };
    } else {
      y = newPage({ logical: logical.index, first: logical.firstRecord, last: logical.lastRecord, continuation: false });
    }
    y = drawColumnHeader(y);
    let pageFirst = logical.firstRecord;

    logical.records.forEach((row, offset) => {
      const recordNumber = logical.firstRecord + offset;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      const cells = options.columns.map((column, index) =>
        doc.splitTextToSize(pdfText(column.value(row, recordNumber - 1)), widths[index] - 2) as string[]
      );
      const lineCount = Math.max(1, ...cells.map((lines) => lines.length));
      // Single-line rows use the page's row height; wrapped cells grow the row.
      const rowHeight = lineCount === 1 ? rowHeightForPage : Math.max(rowHeightForPage, lineCount * lineHeight + 1.4);

      if (y + rowHeight > bottom) {
        // Physical overflow of this logical page: continue on a "(suite)" page.
        const current = pageInfos[pageInfos.length - 1];
        if (current) current.last = recordNumber - 1;
        pageFirst = recordNumber;
        y = newPage({ logical: logical.index, first: pageFirst, last: logical.lastRecord, continuation: true });
        y = drawColumnHeader(y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontSize);
      }

      if (offset % 2 === 1) {
        doc.setFillColor(241, 245, 249);
        doc.rect(MARGIN, y, contentW, rowHeight, "F");
      }
      doc.setTextColor(15, 23, 42);
      let x = MARGIN;
      cells.forEach((lines, index) => {
        const column = options.columns[index];
        const textX = column.align === "right" ? x + widths[index] - 1 : column.align === "center" ? x + widths[index] / 2 : x + 1;
        doc.text(lines, textX, y + lineHeight + 0.4, { align: column.align || "left" });
        x += widths[index];
      });
      y += rowHeight;
    });
    doc.setDrawColor(203, 213, 225);
    doc.line(MARGIN, y, pageW - MARGIN, y);
  });

  // ---------------- Footers ----------------
  const physicalPages = doc.getNumberOfPages();
  const logicalTotal = logicalPages.length;
  for (let page = 1; page <= physicalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const info = pageInfos[page - 1];
    const range = info
      ? `Enregistrements ${info.first}-${info.last} sur ${recordCount} (groupe ${info.logical}/${logicalTotal}${info.continuation ? ", suite" : ""})`
      : `${recordCount} ${recordCount > 1 ? plural : singular}`;
    doc.text(pdfText(`${COMPANY_NAME} - ${options.title}`), MARGIN, pageH - 5);
    doc.text(pdfText(range), pageW / 2, pageH - 5, { align: "center" });
    doc.text(`Page ${page} / ${physicalPages}`, pageW - MARGIN, pageH - 5, { align: "right" });
  }

  return doc;
}

export function downloadTableReportPdf<T>(options: TableReportOptions<T>) {
  const doc = buildTableReportPdf(options);
  doc.save(options.fileName.endsWith(".pdf") ? options.fileName : `${options.fileName}.pdf`);
  return doc.getNumberOfPages();
}

export function pdfFileStamp(from: string, to: string) {
  return from === to ? from : `${from}_${to}`;
}
