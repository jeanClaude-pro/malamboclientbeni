import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  dayCount,
  daysInMonth,
  enumerateDays,
  gmt2YMD,
  isValidYMD,
  periodLabel,
  resolveRange,
  shiftAnchor,
  stockReportParams,
  weekStart,
  type PeriodValue,
} from "./businessDate.ts";

const value = (period: PeriodValue["period"], anchor: string, from = anchor, to = anchor): PeriodValue => ({ period, anchor, from, to });

test("month lengths and leap years are real calendar values", () => {
  assert.equal(daysInMonth(2026, 1), 31);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2027, 2), 28);
  assert.equal(daysInMonth(2028, 2), 29);
  assert.equal(daysInMonth(2100, 2), 28);
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(isValidYMD("2027-02-29"), false);
  assert.equal(isValidYMD("2028-02-29"), true);
  assert.equal(isValidYMD("2026-04-31"), false);
});

test("month and year ranges cover every actual day", () => {
  assert.deepEqual(resolveRange(value("month", "2026-01-15")), { from: "2026-01-01", to: "2026-01-31" });
  assert.deepEqual(resolveRange(value("month", "2026-04-02")), { from: "2026-04-01", to: "2026-04-30" });
  assert.deepEqual(resolveRange(value("month", "2027-02-10")), { from: "2027-02-01", to: "2027-02-28" });
  assert.deepEqual(resolveRange(value("month", "2028-02-10")), { from: "2028-02-01", to: "2028-02-29" });
  assert.equal(enumerateDays("2028-02-01", "2028-02-29").length, 29);
  assert.deepEqual(resolveRange(value("year", "2028-07-01")), { from: "2028-01-01", to: "2028-12-31" });
  assert.equal(dayCount("2028-01-01", "2028-12-31"), 366);
  assert.equal(dayCount("2027-01-01", "2027-12-31"), 365);
});

test("weeks are Monday to Sunday across month and year boundaries", () => {
  assert.equal(weekStart("2026-10-11"), "2026-10-05"); // Sunday
  assert.deepEqual(resolveRange(value("week", "2026-10-01")), { from: "2026-09-28", to: "2026-10-04" });
  assert.deepEqual(resolveRange(value("week", "2027-01-01")), { from: "2026-12-28", to: "2027-01-03" });
});

test("December 31 rolls into January 1 and custom ranges are inclusive", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.deepEqual(resolveRange(value("custom", "2026-03-05", "2026-03-05", "2026-03-05")), { from: "2026-03-05", to: "2026-03-05" });
  assert.deepEqual(resolveRange(value("custom", "2026-03-05", "2026-03-09", "2026-03-01")), { from: "2026-03-01", to: "2026-03-09" });
});

test("navigation clamps month ends instead of overflowing", () => {
  assert.equal(shiftAnchor("month", "2026-01-31", 1), "2026-02-28");
  assert.equal(shiftAnchor("month", "2028-01-31", 1), "2028-02-29");
  assert.equal(shiftAnchor("month", "2026-12-15", 1), "2027-01-15");
  assert.equal(shiftAnchor("month", "2026-01-15", -1), "2025-12-15");
  assert.equal(shiftAnchor("year", "2028-02-29", 1), "2029-02-28");
  assert.equal(shiftAnchor("week", "2026-12-30", 1), "2027-01-06");
});

test("the business day is GMT+2 whatever the browser timezone", () => {
  assert.equal(gmt2YMD(new Date("2026-12-31T21:59:59Z")), "2026-12-31");
  assert.equal(gmt2YMD(new Date("2026-12-31T22:00:00Z")), "2027-01-01");
  assert.equal(gmt2YMD(new Date("2026-06-30T23:30:00-05:00")), "2026-07-01");
});

test("labels and API params", () => {
  assert.equal(periodLabel(value("week", "2026-10-07"), "2026-10-11"), "Cette semaine du 05/10/2026 au 11/10/2026");
  assert.equal(periodLabel(value("month", "2026-02-07"), "2026-10-11"), "Février 2026");
  assert.equal(periodLabel(value("day", "2026-10-11"), "2026-10-11"), "Aujourd'hui (11/10/2026)");
  assert.deepEqual(stockReportParams(value("month", "2026-10-11")), { period: "month", date: "2026-10-11" });
  assert.deepEqual(stockReportParams(value("custom", "x", "2026-10-01", "2026-10-15")), { period: "custom", from: "2026-10-01", to: "2026-10-15" });
});
