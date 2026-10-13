import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className = "" }: StatCardProps) {
  return (
    <div className={`card min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider break-words">
            {label}
          </p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 break-words">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend.positive ? "text-green-600" : "text-red-600"}`}>
              {trend.positive ? "+" : ""}{trend.value}
            </p>
          )}
        </div>
        {icon && <div className="text-gray-400 shrink-0">{icon}</div>}
      </div>
    </div>
  );
}
