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

export interface GlobalStockReport {
  success: boolean;
  branch: { id: string; name: string };
  period: StockReportPeriod;
  generatedAt: string;
  count: number;
  items: StockReportItem[];
}

export interface ProductStockReport {
  success: boolean;
  branch: { id: string; name: string };
  period: StockReportPeriod;
  generatedAt: string;
  item: StockReportItem;
}
