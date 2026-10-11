import test from "node:test";
import assert from "node:assert/strict";
import { logicalPageCount, paginateRecords, RECORDS_PER_PDF_PAGE } from "./reportPagination.ts";

test("PDF exports group exactly 50 records per logical page", () => {
  assert.equal(RECORDS_PER_PDF_PAGE, 50);
  const cases: Array<[number, number]> = [[0, 0], [1, 1], [50, 1], [51, 2], [100, 2], [101, 3], [125, 3], [850, 17]];
  for (const [count, pages] of cases) {
    const records = Array.from({ length: count }, (_, i) => ({ id: i + 1 }));
    const logical = paginateRecords(records);
    assert.equal(logical.length, pages, `${count} records`);
    assert.equal(logicalPageCount(count), pages);
    // Every page but the last is full; nothing is padded.
    logical.forEach((page, index) => {
      if (index < logical.length - 1) assert.equal(page.records.length, 50);
      assert.ok(page.records.length >= 1 && page.records.length <= 50);
    });
    // No record missing, duplicated or reordered.
    const flattened = logical.flatMap((page) => page.records.map((record) => record.id));
    assert.deepEqual(flattened, records.map((record) => record.id));
    if (count > 0) {
      assert.equal(logical[0].firstRecord, 1);
      assert.equal(logical.at(-1)!.lastRecord, count);
    }
  }
});

test("invalid page sizes are rejected", () => {
  assert.throws(() => paginateRecords([1, 2], 0));
});
