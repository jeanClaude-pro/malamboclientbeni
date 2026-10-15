import test from "node:test";
import assert from "node:assert/strict";
import { fromGmt2DateTimeInput, todayYMD, toGmt2DateTimeInput } from "./businessDate.ts";
import { createRequestKeyHolder } from "./requestKey.ts";

test("datetime inputs are shown and read in GMT+2 whatever the browser timezone", () => {
  // 22:30 UTC = 00:30 the next day in Butembo/Beni
  assert.equal(toGmt2DateTimeInput("2026-10-15T22:30:00Z"), "2026-10-16T00:30");
  assert.equal(fromGmt2DateTimeInput("2026-10-16T00:30"), "2026-10-15T22:30:00.000Z");
  // round trip
  assert.equal(fromGmt2DateTimeInput(toGmt2DateTimeInput("2026-12-31T21:59:00Z")), "2026-12-31T21:59:00.000Z");
  assert.equal(toGmt2DateTimeInput(null), "");
  assert.equal(fromGmt2DateTimeInput("garbage"), "");
});

test("today's business date switches at GMT+2 midnight, not UTC midnight", () => {
  assert.equal(todayYMD(new Date("2026-10-15T21:59:59Z")), "2026-10-15");
  assert.equal(todayYMD(new Date("2026-10-15T22:00:00Z")), "2026-10-16");
});

test("one request key per operation, kept across retries", () => {
  const holder = createRequestKeyHolder("sale");
  const first = holder.get();
  assert.match(first, /^[A-Za-z0-9_-]{8,100}$/);
  assert.equal(holder.get(), first, "retry re-sends the same key");
  holder.reset();
  assert.notEqual(holder.get(), first, "next operation gets a new key");
});
