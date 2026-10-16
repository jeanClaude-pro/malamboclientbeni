// Response shapes of /api/stock-reports (server/services/stockLedger.js).
// Every quantity is an exact number of PIECES.

export interface StockMovementTotals {
  opening: number;
  sold: number;
  bonus: number;
  additions: number;
  removals: number;
  otherIn: number;
  otherOut: number;
  otherNet: number;
  totalIn: number;
  totalOut: number;
  closing: number;
}

export interface StockReportRow extends StockMovementTotals {
  /** "YYYY-MM-DD" (daily rows) or "YYYY-MM" (monthly rows). */
  key: string;
}

export interface StockReportWarning {
  code: "untracked_opening" | "negative_balance" | "carton_size_changed" | "reconciliation_mismatch" | "document_mismatch" | string;
  message: string;
}

export interface StockReportItem extends StockMovementTotals {
  productId: string;
  name: string;
  category: string;
  brand: string;
  status: "active" | "inactive";
  piecesPerCarton: number;
  currentStock: number;
  breakdown: Record<string, number>;
  rows?: StockReportRow[];
  warnings: StockReportWarning[];
  /** Check of the history documents of the period (global sheet). */
  documents?: StockDocumentsSummary;
}

export interface StockReportPeriod {
  period: string;
  from: string;
  to: string;
  start: string;
  endExclusive: string;
  dayCount: number;
  granularity: "day" | "month";
  timezone: string;
}

/** Which products the global sheet lists (server default: "moved"). */
export type GlobalStockScope = "moved" | "sold" | "catalog";

export interface GlobalStockReport {
  success: boolean;
  branch: { id: string; name: string };
  period: StockReportPeriod;
  scope?: GlobalStockScope;
  generatedAt: string;
  count: number;
  items: StockReportItem[];
  documentsSummary?: StockDocumentsSummary | null;
  documentsTruncated?: StockDocumentKind[];
  /** Set when the history check could not run (the sheet itself is still exact). */
  documentsError?: string;
  /** Products listed in a history this period without any stock movement. */
  productsWithoutMovement?: ProductWithoutMovement[];
  mismatches?: StockDocument[];
}

// ---------------------------------------------------------------------------
// History documents of the period matched with the stock movements
// (server/services/stockDocuments.js — rules in services/operationRules.js)
// ---------------------------------------------------------------------------

export type StockDocumentKind = "sale" | "trip" | "transfer" | "reception";

/**
 * counted   — the stock moved by what the document says, on its history day
 * no_effect — the document does not move stock (reason given)
 * mismatch  — should have moved stock and did not / other quantity / other day
 * deleted   — movements of a deleted document (they cancel out)
 */
export type StockDocumentStatus = "counted" | "no_effect" | "mismatch" | "deleted";

export interface StockDocument {
  kind: StockDocumentKind;
  kindLabel: string;
  /** History screen that lists the document. */
  history: string;
  /** "default" / "voided" view of the history; null when not listed. */
  view: "default" | "voided" | null;
  id: string | null;
  reference: string;
  /** Business date (ISO) — the day the history lists it. */
  date: string | null;
  day: string | null;
  productId: string;
  productName: string;
  docStatus: string;
  docStatusLabel: string;
  status: StockDocumentStatus;
  /** Signed pieces the document must move (+ in, − out). */
  expected: number | null;
  /** Signed pieces actually moved by its stock movements (all time). */
  ledger: number | null;
  /** Signed pieces of its movements inside the period. */
  inPeriod: number;
  verifiable: boolean;
  reason: string;
  message: string;
}

export interface StockDocumentsSummary {
  total: number;
  counted: number;
  noEffect: number;
  mismatch: number;
  deleted: number;
}

export interface ProductWithoutMovement extends StockDocumentsSummary {
  productId: string;
  name: string;
  reasons: string[];
}

/** Added by the history lists (trucks, transfers, receptions) to each row. */
export interface StockImpact {
  affectsStock: boolean;
  reason: string;
}

/** One stock operation of the period (individual sheet). */
export interface StockTransaction {
  id: string;
  /** Business date of the operation (ISO instant). */
  date: string;
  recordedAt: string | null;
  type: string;
  origin: string | null;
  /** Column the operation counts in. */
  category: "sold" | "bonus" | "additions" | "removals" | "otherIn" | "otherOut";
  label: string;
  reference: string;
  notes: string;
  /** Pieces moved (always positive). */
  quantity: number;
  /** Signed stock change in pieces (+ in, − out). */
  signed: number;
  /** Bonus part of a sale, in pieces. */
  bonus: number;
  piecesPerCarton: number;
  recordedBy: string;
  reversed: boolean;
  /** Stock right after this operation, starting from the period's opening. */
  balanceAfter: number;
}

export interface ProductStockReport {
  success: boolean;
  branch: { id: string; name: string };
  period: StockReportPeriod;
  generatedAt: string;
  item: StockReportItem;
  transactions?: StockTransaction[];
  transactionsTruncated?: boolean;
  documents?: StockDocument[];
  documentsSummary?: StockDocumentsSummary | null;
  documentsTruncated?: StockDocumentKind[];
  documentsError?: string;
}
