"use client";

import { Download } from "lucide-react";

export function CsvDownloadButton({
  filename,
  headers,
  label = "Exportar CSV",
  rows,
}: {
  filename: string;
  headers: string[];
  label?: string;
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
  return <button className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border bg-surface px-2 text-xs font-semibold transition hover:bg-accent sm:min-h-11 sm:w-auto sm:gap-2 sm:px-4 sm:text-sm" onClick={download} type="button"><Download className="size-4" /> {label}</button>;
}
