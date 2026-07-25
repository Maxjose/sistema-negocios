"use client";

import { Download } from "lucide-react";

export function CsvDownloadButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
}) {
  const download = () => {
    const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-surface px-4 text-sm font-semibold" onClick={download} type="button"><Download className="size-4" /> Exportar CSV</button>;
}
