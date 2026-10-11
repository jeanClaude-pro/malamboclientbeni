import test from "node:test";
import assert from "node:assert/strict";
import { formatCartonsPieces, splitCartons } from "./quantity.ts";

const clean = (text: string) => text.replace(/[\u202f\u00a0]/g, " ");

test("stock is shown as cartons + remaining pieces for the product's carton size", () => {
  assert.equal(formatCartonsPieces(149, 12), "12 cartons + 5 pièces");
  assert.equal(formatCartonsPieces(24, 12), "2 cartons");
  assert.equal(formatCartonsPieces(12, 12), "1 carton");
  assert.equal(formatCartonsPieces(5, 12), "5 pièces");
  assert.equal(formatCartonsPieces(1, 24), "1 pièce");
  assert.equal(formatCartonsPieces(0, 12), "0 carton");
  assert.equal(formatCartonsPieces(149, 6), "24 cartons + 5 pièces");
});

test("products sold by the piece and signed net movements", () => {
  assert.equal(clean(formatCartonsPieces(1500, 1)), "1 500 pièces");
  assert.equal(formatCartonsPieces(-13, 12, { signed: true }), "-1 carton + 1 pièce");
  assert.equal(formatCartonsPieces(13, 12, { signed: true }), "+1 carton + 1 pièce");
  assert.equal(formatCartonsPieces(-13, 12), "-1 carton + 1 pièce");
  assert.deepEqual(splitCartons(149, 12), { cartons: 12, pieces: 5 });
});
