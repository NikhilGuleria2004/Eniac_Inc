export const CHART_COLORS = {
  onTrack: "#16803C",
  atRisk: "#B7791F",
  delayed: "#C53030",
  completed: "#667085",
  accent: "#1A8A5A",
  accentLight: "#4CAF50",
  info: "#2563EB",
  palette: ["#1A8A5A", "#2563EB", "#B7791F", "#7C3AED", "#C53030", "#0EA5E9", "#F59E0B", "#10B981", "#6366F1", "#EC4899"],
};

export const chartTooltipStyle = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  boxShadow: "0 2px 8px rgba(16, 24, 40, 0.08)",
  fontSize: "12px",
};

export const axisTick = { fontSize: 11, fill: "var(--color-muted)" };

export interface DonutPoint {
  name: string;
  value: number;
  fill: string;
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
