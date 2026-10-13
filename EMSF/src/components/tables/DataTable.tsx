import { type ReactNode, useState } from "react";
import { Checkbox } from "../ui/Checkbox";
import { EmptyState } from "../ui/EmptyState";

interface Column<T> {
  key: string;
  header: string;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  error?: string;
  emptyState?: {
    title: string;
    description?: string;
    action?: ReactNode;
  };
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  bulkActions?: ReactNode;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  error,
  emptyState,
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  bulkActions,
  className = "",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = (a as Record<string, unknown>)[sortKey];
    const bVal = (b as Record<string, unknown>)[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDirection === "asc" ? 1 : -1;
    if (bVal == null) return sortDirection === "asc" ? -1 : 1;
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSelection = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter((r) => r !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  };

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedRows.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map(keyExtractor));
    }
  };

  if (error) {
    return (
      <div className={`card ${className}`}>
        <div className="text-center py-8">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <button className="btn btn-secondary text-xs">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className={`card ${className}`}>
        <EmptyState
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      {bulkActions && selectedRows.length > 0 && (
        <div className="mb-3 flex items-center gap-2 p-2 bg-blue-50 rounded-md">
          <span className="text-sm text-blue-800">
            {selectedRows.length} selected
          </span>
          {bulkActions}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {selectable && (
                <th className="py-2 px-3 w-10">
                  <Checkbox
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`text-left py-2 px-3 font-medium text-gray-600 ${column.width || ""}`}
                >
                  <button
                    onClick={() => column.sortable && handleSort(column.key)}
                    className={`flex items-center gap-1 ${column.sortable ? "cursor-pointer hover:text-gray-900" : ""}`}
                  >
                    {column.header}
                    {column.sortable && sortKey === column.key && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => {
              const id = keyExtractor(row);
              const isSelected = selectedRows.includes(id);
              return (
                <tr
                  key={id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${onRowClick ? "cursor-pointer" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="py-2 px-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelection(id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="py-2 px-3">
                      {column.cell
                        ? column.cell(row)
                        : (row as Record<string, unknown>)[column.key] as ReactNode}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
