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
  code: "untracked_opening" | "negative_balance" | "carton_size_changed" | "reconciliation_mismatch" | string;
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
}
