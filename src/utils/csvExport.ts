// CSV download with proper quoting (commas, quotes and line breaks in values)
// and a UTF-8 BOM so Excel shows accents correctly.
function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(fileName: string, headers: string[], rows: unknown[][]) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
