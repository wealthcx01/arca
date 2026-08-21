import { type ReactNode, useState } from "react";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  sortFn?: (a: T, b: T) => number;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  dense?: boolean;
  maxHeight?: string;
  emptyMessage?: string;
}

type SortDir = "asc" | "desc";

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  dense = true,
  maxHeight = "400px",
  emptyMessage = "No data",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("desc");
    }
  };

  const sorted = [...data];
  if (sortKey) {
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sortFn) {
      sorted.sort((a, b) => (sortDir === "asc" ? col.sortFn!(a, b) : col.sortFn!(b, a)));
    }
  }

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className={`w-full border-collapse ${dense ? "terminal-dense" : "text-sm"}`}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-[var(--color-muted)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`border-b border-[var(--color-border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                      ? "text-center"
                      : "text-left"
                } ${col.sortable ? "cursor-pointer select-none hover:text-[var(--color-foreground)]" : ""}`}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => handleSort(col)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-0.5">{sortDir === "asc" ? "\u25B2" : "\u25BC"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-xs text-[var(--color-muted-foreground)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, i) => (
              <tr
                key={rowKey(row)}
                className={`transition-colors hover:bg-[var(--color-muted)] ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-2 py-1 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                    }`}
                  >
                    {col.render
                      ? col.render(row, i)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
