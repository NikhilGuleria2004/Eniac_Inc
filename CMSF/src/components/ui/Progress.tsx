interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: string;
}

export function Progress({ value, max = 100, className = "", showLabel = false, color = "var(--color-accent)" }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs text-gray-600">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
