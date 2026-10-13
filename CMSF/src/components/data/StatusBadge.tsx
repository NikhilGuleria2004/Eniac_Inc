import { STATUS_COLORS, PROJECT_STATUS_COLORS, TIMESHEET_STATUS_COLORS, INVOICE_STATUS_COLORS } from "../../data/constants";

const maps: Record<string, Record<string, string>> = {
  status: STATUS_COLORS,
  project: PROJECT_STATUS_COLORS,
  timesheet: TIMESHEET_STATUS_COLORS,
  invoice: INVOICE_STATUS_COLORS,
};

export function statusClass(status: string, kind: "status" | "project" | "timesheet" | "invoice" = "status"): string {
  const map = maps[kind];
  return (map && map[status]) || "badge-neutral";
}

export function StatusBadge({ status, kind = "status", label }: { status: string; kind?: "status" | "project" | "timesheet" | "invoice"; label?: string }) {
  return <span className={`badge ${statusClass(status, kind)}`}>{label ?? status}</span>;
}
