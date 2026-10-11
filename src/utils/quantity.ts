// Display helpers for stock quantities. Stock is stored as an exact number of
// PIECES; cartons are only a presentation of that number for a product's
// pieces-per-carton. Never round or convert the stored value.

function safePpc(piecesPerCarton: number) {
  return Math.max(1, Math.floor(Number(piecesPerCarton) || 1));
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count.toLocaleString("fr-FR")} ${Math.abs(count) > 1 ? pluralForm : singular}`;
}

export function splitCartons(totalPieces: number, piecesPerCarton: number) {
  const ppc = safePpc(piecesPerCarton);
  const total = Math.trunc(Math.abs(Number(totalPieces) || 0));
  return { cartons: Math.floor(total / ppc), pieces: total % ppc };
}

/**
 * "12 cartons + 5 pièces", "3 cartons", "7 pièces", "0 carton".
 * Products sold by the piece (1 piece per carton) are shown in pièces only.
 * With `signed`, positive values get "+" and negative ones "-" (net movements).
 */
export function formatCartonsPieces(totalPieces: number, piecesPerCarton: number, options: { signed?: boolean } = {}) {
  const value = Math.trunc(Number(totalPieces) || 0);
  const ppc = safePpc(piecesPerCarton);
  const sign = value < 0 ? "-" : options.signed && value > 0 ? "+" : "";
  if (ppc === 1) return `${sign}${plural(Math.abs(value), "pièce", "pièces")}`;
  const { cartons, pieces } = splitCartons(value, ppc);
  if (cartons === 0 && pieces === 0) return "0 carton";
  const parts: string[] = [];
  if (cartons > 0) parts.push(plural(cartons, "carton", "cartons"));
  if (pieces > 0) parts.push(plural(pieces, "pièce", "pièces"));
  return `${sign}${parts.join(" + ")}`;
}

/** "1 250 pièces" — the exact stored quantity. */
export function formatPieces(totalPieces: number) {
  return plural(Math.trunc(Number(totalPieces) || 0), "pièce", "pièces");
}
