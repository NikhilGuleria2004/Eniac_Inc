import { correctionState, type CorrectionState } from "./attendance";
import type { Attendance } from "../../types";

const STATE_STYLES: Record<Exclude<CorrectionState, "NONE">, string> = {
  REQUESTED: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-danger",
};

const STATE_LABELS: Record<CorrectionState, string> = {
  NONE: "—",
  REQUESTED: "Correction requested",
  APPROVED: "Correction approved",
  REJECTED: "Correction rejected",
};

export function CorrectionBadge({ record }: { record: Attendance }) {
  const state = correctionState(record);
  if (state === "NONE") {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return <span className={`badge ${STATE_STYLES[state]}`}>{STATE_LABELS[state]}</span>;
}
