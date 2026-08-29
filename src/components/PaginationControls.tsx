/* eslint-disable react-refresh/only-export-components */
export type PaginationState = {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export const EMPTY_PAGINATION: PaginationState = {
  page: 1, limit: 50, totalRecords: 0, totalPages: 0,
  hasNextPage: false, hasPreviousPage: false,
};

export default function PaginationControls({ value, onPageChange }: {
  value: PaginationState;
  onPageChange: (page: number) => void;
}) {
  if (value.totalRecords === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm text-slate-600">
        Page {value.page} sur {value.totalPages} · {value.totalRecords.toLocaleString("fr-FR")} résultat(s)
      </span>
      <div className="flex gap-2">
        <button type="button" disabled={!value.hasPreviousPage} onClick={() => onPageChange(value.page - 1)} className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Précédent</button>
        <button type="button" disabled={!value.hasNextPage} onClick={() => onPageChange(value.page + 1)} className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Suivant</button>
      </div>
    </div>
  );
}
