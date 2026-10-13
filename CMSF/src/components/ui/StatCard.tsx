import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { direction: "up" | "down" | "flat"; value?: string };
  supporting?: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const valueColors: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "text-gray-900",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

const iconColors: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "text-gray-400 bg-gray-50",
  success: "text-success bg-green-50",
  warning: "text-warning bg-yellow-50",
  danger: "text-danger bg-red-50",
  info: "text-info bg-blue-50",
};

export function StatCard({ label, value, icon, trend, supporting, variant = "default" }: StatCardProps) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{label}</p>
          <p className={`text-2xl font-semibold mt-1 ${valueColors[variant]}`}>{value}</p>
          {trend && (
            <p className="text-xs mt-1 flex items-center gap-1">
              <span className={trend.direction === "up" ? "text-success" : trend.direction === "down" ? "text-danger" : "text-gray-400"}>
                {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}
                {trend.value ? ` ${trend.value}` : ""}
              </span>
            </p>
          )}
          {supporting && <p className="text-xs text-gray-500 mt-1">{supporting}</p>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md ${iconColors[variant]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
