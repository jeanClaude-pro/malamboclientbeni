// Logical pagination of exported reports: at most RECORDS_PER_PDF_PAGE data
// records per PDF page. Records are only split, never dropped, duplicated,
// reordered or padded.
export const RECORDS_PER_PDF_PAGE = 50;

export interface LogicalPage<T> {
  /** 1-based logical page number. */
  index: number;
  /** 1-based position of the first / last record of the page in the export. */
  firstRecord: number;
  lastRecord: number;
  records: T[];
}

export function paginateRecords<T>(records: readonly T[], perPage = RECORDS_PER_PDF_PAGE): LogicalPage<T>[] {
  if (!Number.isInteger(perPage) || perPage < 1) throw new Error("perPage must be a positive integer");
  const pages: LogicalPage<T>[] = [];
  for (let start = 0; start < records.length; start += perPage) {
    const slice = records.slice(start, start + perPage);
    pages.push({ index: pages.length + 1, firstRecord: start + 1, lastRecord: start + slice.length, records: slice });
  }
  return pages;
}

export function logicalPageCount(recordCount: number, perPage = RECORDS_PER_PDF_PAGE) {
  return Math.ceil(Math.max(0, recordCount) / perPage);
}
