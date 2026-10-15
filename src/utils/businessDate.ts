// Business calendar helpers (GMT+2, no DST) for period selectors and report
// labels. Pure functions on "YYYY-MM-DD" strings: they never depend on the
// browser's own timezone and never call toISOString() on a local date (which
// shifts the day for anyone east of UTC). The server resolves the same
// periods with server/utils/dateRange.js — keep both in sync.

export type PeriodKind = "day" | "week" | "month" | "year" | "custom";

export interface PeriodValue {
  period: PeriodKind;
  /** Reference day for day/week/month/year (YYYY-MM-DD). */
  anchor: string;
  /** Inclusive custom range (YYYY-MM-DD), used when period === "custom". */
  from: string;
  to: string;
}

export interface ResolvedRange {
  from: string;
  to: string;
}

const GMT2_OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatYMDParts(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseYMD(ymd: string) {
  const match = YMD.exec(ymd);
  if (!match) throw new Error(`Date invalide: ${ymd}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new Error(`Date invalide: ${ymd}`);
  }
  return { year, month, day };
}

export function isValidYMD(ymd: string) {
  try {
    parseYMD(ymd);
    return true;
  } catch {
    return false;
  }
}

/** Real Gregorian month length (28/29/30/31). `month` is 1-12. */
export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Calendar day (YYYY-MM-DD) of an instant, as seen in GMT+2. */
export function gmt2YMD(instant: Date | number = Date.now()) {
  const shifted = new Date(new Date(instant).getTime() + GMT2_OFFSET_MS);
  return formatYMDParts(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function todayYMD(now: Date | number = Date.now()) {
  return gmt2YMD(now);
}

export function addDays(ymd: string, days: number) {
  const { year, month, day } = parseYMD(ymd);
  const next = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  return formatYMDParts(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** Monday of the business week containing `ymd`. */
export function weekStart(ymd: string) {
  const { year, month, day } = parseYMD(ymd);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday
  return addDays(ymd, weekday === 0 ? -6 : 1 - weekday);
}

/** Inclusive from/to of a period. */
export function resolveRange(value: PeriodValue): ResolvedRange {
  if (value.period === "custom") {
    const from = value.from <= value.to ? value.from : value.to;
    const to = value.from <= value.to ? value.to : value.from;
    return { from, to };
  }
  const { year, month } = parseYMD(value.anchor);
  switch (value.period) {
    case "day":
      return { from: value.anchor, to: value.anchor };
    case "week": {
      const from = weekStart(value.anchor);
      return { from, to: addDays(from, 6) };
    }
    case "month":
      return { from: formatYMDParts(year, month, 1), to: formatYMDParts(year, month, daysInMonth(year, month)) };
    case "year":
      return { from: formatYMDParts(year, 1, 1), to: formatYMDParts(year, 12, 31) };
  }
}

/** Moves the anchor by one period (prev/next arrows), clamping month ends. */
export function shiftAnchor(period: PeriodKind, anchor: string, delta: number) {
  const { year, month, day } = parseYMD(anchor);
  switch (period) {
    case "day":
      return addDays(anchor, delta);
    case "week":
      return addDays(anchor, 7 * delta);
    case "month": {
      const index = year * 12 + (month - 1) + delta;
      const nextYear = Math.floor(index / 12);
      const nextMonth = (index % 12) + 1;
      return formatYMDParts(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
    }
    case "year":
      return formatYMDParts(year + delta, month, Math.min(day, daysInMonth(year + delta, month)));
    default:
      return anchor;
  }
}

/** Every calendar day of an inclusive range. */
export function enumerateDays(from: string, to: string) {
  const days: string[] = [];
  for (let current = from; current <= to; current = addDays(current, 1)) days.push(current);
  return days;
}

export function dayCount(from: string, to: string) {
  const a = parseYMD(from);
  const b = parseYMD(to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY_MS) + 1;
}

/** "11/10/2026" */
export function formatDayFr(ymd: string) {
  const { year, month, day } = parseYMD(ymd);
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

/** "octobre 2026" */
export function formatMonthFr(ymdOrYm: string) {
  const [year, month] = ymdOrYm.split("-").map(Number);
  return `${MONTHS_FR[month - 1]} ${year}`;
}

/** Human French label of a period, e.g. "Semaine du 05/10/2026 au 11/10/2026". */
export function periodLabel(value: PeriodValue, today = todayYMD()) {
  const { from, to } = resolveRange(value);
  const isCurrent = (() => {
    if (value.period === "custom") return false;
    const current = resolveRange({ ...value, anchor: today });
    return current.from === from && current.to === to;
  })();
  switch (value.period) {
    case "day":
      return isCurrent ? `Aujourd'hui (${formatDayFr(from)})` : `Jour : ${formatDayFr(from)}`;
    case "week":
      return `${isCurrent ? "Cette semaine" : "Semaine"} du ${formatDayFr(from)} au ${formatDayFr(to)}`;
    case "month": {
      const label = formatMonthFr(from);
      return isCurrent ? `Ce mois (${label})` : label.charAt(0).toUpperCase() + label.slice(1);
    }
    case "year":
      return isCurrent ? `Cette année (${from.slice(0, 4)})` : `Année ${from.slice(0, 4)}`;
    case "custom":
      return from === to ? `Jour : ${formatDayFr(from)}` : `Du ${formatDayFr(from)} au ${formatDayFr(to)}`;
  }
}

export function defaultPeriod(period: PeriodKind = "day", today = todayYMD()): PeriodValue {
  const base: PeriodValue = { period, anchor: today, from: today, to: today };
  if (period === "custom") {
    const { from } = resolveRange({ ...base, period: "month" });
    return { ...base, from, to: today };
  }
  return base;
}

/** Inclusive `from`/`to` query params understood by every history endpoint. */
export function rangeParams(value: PeriodValue) {
  const { from, to } = resolveRange(value);
  return { from, to };
}

/** Params of the Fiche de stock endpoints (period + anchor or custom range). */
export function stockReportParams(value: PeriodValue) {
  if (value.period === "custom") {
    const { from, to } = resolveRange(value);
    return { period: "custom", from, to };
  }
  return { period: value.period, date: value.anchor };
}

/**
 * Value for an `<input type="datetime-local">` showing an instant in GMT+2
 * (Butembo/Beni), whatever the browser's own timezone is.
 */
export function toGmt2DateTimeInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + GMT2_OFFSET_MS).toISOString().slice(0, 16);
}

/**
 * ISO instant for a `datetime-local` value typed in GMT+2 ("2026-10-15T08:30"),
 * so a browser in another timezone (e.g. Nairobi, GMT+3) cannot shift it.
 */
export function fromGmt2DateTimeInput(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return "";
  const date = new Date(`${local.slice(0, 16)}:00+02:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
