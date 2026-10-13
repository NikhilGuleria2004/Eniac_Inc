interface FilterBarProps {
  filters: {
    key: string;
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (value: string) => void;
  }[];
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({ filters, onClearAll, className = "" }: FilterBarProps) {
  const hasActiveFilters = filters.some((f) => f.value !== "all");

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-1">
          <label className="text-xs text-gray-500">{filter.label}</label>
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="form-input py-1 text-xs w-auto"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      {hasActiveFilters && onClearAll && (
        <button onClick={onClearAll} className="text-xs text-accent hover:underline">
          Clear all
        </button>
      )}
    </div>
  );
}
