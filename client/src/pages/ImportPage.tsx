import { AlertTriangle, Check, FileText, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { api } from "../lib/api";

interface ParsedRow {
  card_name: string;
  set_name?: string;
  type: "BUY" | "SELL";
  quantity: number;
  price: number;
  currency: string;
  trade_date: string;
  condition?: string;
  matched_card_id?: string;
  match_status: "matched" | "unmatched" | "error";
  error?: string;
}

interface ColumnMapping {
  card_name: string;
  set_name: string;
  type: string;
  quantity: string;
  price: string;
  currency: string;
  trade_date: string;
  condition: string;
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

export function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    card_name: "",
    set_name: "",
    type: "",
    quantity: "",
    price: "",
    currency: "",
    trade_date: "",
    condition: "",
  });
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState({ imported: 0, skipped: 0, errors: 0 });
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return;

    // Auto-detect delimiter
    const firstLine = lines[0] || "";
    const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

    const parseRow = (line: string) => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const hdrs = parseRow(firstLine);
    const rows = lines.slice(1).map(parseRow);

    setHeaders(hdrs);
    setRawRows(rows);

    // Auto-detect column mappings
    const autoMap = { ...mapping };
    for (const h of hdrs) {
      const lower = h.toLowerCase();
      if (lower.includes("card") || lower.includes("name")) autoMap.card_name = h;
      else if (lower.includes("set")) autoMap.set_name = h;
      else if (lower.includes("type") || lower.includes("buy") || lower.includes("direction"))
        autoMap.type = h;
      else if (lower.includes("qty") || lower.includes("quantity") || lower.includes("amount"))
        autoMap.quantity = h;
      else if (lower.includes("price") || lower.includes("cost")) autoMap.price = h;
      else if (lower.includes("currency") || lower.includes("ccy")) autoMap.currency = h;
      else if (lower.includes("date")) autoMap.trade_date = h;
      else if (lower.includes("condition") || lower.includes("grade")) autoMap.condition = h;
    }
    setMapping(autoMap);
    setStep("mapping");
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleMapping = () => {
    // Apply mapping to raw rows
    const rows: ParsedRow[] = rawRows.map((row) => {
      try {
        const getVal = (col: string) => {
          const idx = headers.indexOf(col);
          return idx >= 0 ? row[idx] || "" : "";
        };

        const typeStr = getVal(mapping.type).toUpperCase();
        const type: "BUY" | "SELL" =
          typeStr.includes("SELL") || typeStr === "V" || typeStr === "S" ? "SELL" : "BUY";

        return {
          card_name: getVal(mapping.card_name),
          set_name: mapping.set_name ? getVal(mapping.set_name) : undefined,
          type,
          quantity: Number.parseInt(getVal(mapping.quantity)) || 1,
          price: Number.parseFloat(getVal(mapping.price)) || 0,
          currency: (mapping.currency ? getVal(mapping.currency) : "") || "GBP",
          trade_date: getVal(mapping.trade_date) || new Date().toISOString().split("T")[0] || "",
          condition: mapping.condition ? getVal(mapping.condition) : undefined,
          match_status: "unmatched" as const,
        };
      } catch {
        return {
          card_name: "",
          type: "BUY" as const,
          quantity: 0,
          price: 0,
          currency: "GBP",
          trade_date: "",
          match_status: "error" as const,
          error: "Failed to parse row",
        };
      }
    });

    setParsedRows(rows.filter((r) => r.card_name));
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of parsedRows) {
      if (row.match_status === "error") {
        errors++;
        continue;
      }

      try {
        // Try to find card by name
        const searchRes = await api.get<{ data: { id: string }[] }>(
          `/cards?q=${encodeURIComponent(row.card_name)}&limit=1`,
        );
        const card = searchRes.data[0];
        if (!card) {
          skipped++;
          continue;
        }

        // Get first portfolio
        const portfolios = await api.get<{ id: string }[]>("/portfolio");
        const portfolio = portfolios[0];
        if (!portfolio) {
          errors++;
          continue;
        }

        await api.post(`/portfolio/${portfolio.id}/transactions`, {
          card_id: card.id,
          type: row.type,
          quantity: row.quantity,
          price_cents: Math.round(row.price * 100),
          currency: row.currency,
          trade_date: new Date(row.trade_date).toISOString(),
          condition: row.condition || "NM",
          source: "csv_import",
        });
        imported++;
      } catch {
        errors++;
      }
    }

    setImportResult({ imported, skipped, errors });
    setStep("done");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold">Import Transactions</h1>

      {step === "upload" && (
        <div
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
            dragActive
              ? "border-[var(--color-primary)] bg-[var(--color-highlight)]"
              : "border-[var(--color-border)]"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <Upload size={32} className="mb-3 text-[var(--color-muted-foreground)]" />
          <p className="text-sm font-medium">Drop CSV file here or click to browse</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Supports CSV files. WhatNot exports and generic formats.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
          >
            Choose File
          </button>
        </div>
      )}

      {step === "mapping" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileText size={16} />
              <span className="text-sm font-medium">{fileName}</span>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                ({rawRows.length} rows)
              </span>
            </div>

            <h3 className="mb-3 text-sm font-semibold">Column Mapping</h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(mapping) as Array<keyof ColumnMapping>).map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium capitalize">
                    {key.replace("_", " ")}{" "}
                    {key === "card_name" || key === "quantity" || key === "price" ? "*" : ""}
                  </label>
                  <select
                    value={mapping[key]}
                    onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}
                    className="w-full rounded border border-[var(--color-input)] bg-[var(--color-background)] px-2 py-1.5 text-sm"
                  >
                    <option value="">— Skip —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep("upload")}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
            >
              Back
            </button>
            <button
              onClick={handleMapping}
              disabled={!mapping.card_name}
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50"
            >
              Preview Import
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex gap-3 text-sm">
            <span className="flex items-center gap-1 text-[var(--color-positive)]">
              <Check size={14} /> {parsedRows.filter((r) => r.match_status !== "error").length}{" "}
              ready
            </span>
            <span className="flex items-center gap-1 text-[var(--color-negative)]">
              <X size={14} /> {parsedRows.filter((r) => r.match_status === "error").length} errors
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-card)]">
                <tr className="border-b border-[var(--color-border)] text-left text-xs font-medium uppercase text-[var(--color-muted-foreground)]">
                  <th className="px-3 py-2">Card</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-3 py-2">{row.card_name}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                          row.type === "BUY"
                            ? "bg-[color-mix(in_srgb,var(--color-positive)_15%,var(--color-card))] text-[var(--color-positive)]"
                            : "bg-[color-mix(in_srgb,var(--color-negative)_15%,var(--color-card))] text-[var(--color-negative)]"
                        }`}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{row.quantity}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {row.price.toFixed(2)} {row.currency}
                    </td>
                    <td className="px-3 py-2">{row.trade_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setStep("mapping")}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
            >
              Import {parsedRows.filter((r) => r.match_status !== "error").length} Transactions
            </button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="flex h-48 flex-col items-center justify-center text-center">
          <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
          <p className="text-sm">Importing transactions...</p>
        </div>
      )}

      {step === "done" && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
          <Check size={32} className="mx-auto mb-3 text-[var(--color-positive)]" />
          <h2 className="text-lg font-semibold">Import Complete</h2>
          <div className="mt-3 flex justify-center gap-6 text-sm">
            <span className="text-[var(--color-positive)]">{importResult.imported} imported</span>
            <span className="text-[var(--color-warning)]">{importResult.skipped} skipped</span>
            <span className="text-[var(--color-negative)]">{importResult.errors} errors</span>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <a
              href="/dashboard"
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] hover:opacity-90"
            >
              Go to Dashboard
            </a>
            <button
              onClick={() => {
                setStep("upload");
                setParsedRows([]);
                setRawRows([]);
                setHeaders([]);
              }}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-muted)]"
            >
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
