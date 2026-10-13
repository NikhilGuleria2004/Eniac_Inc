import { DataTable } from "../../../components/tables/DataTable";
import { StatusBadge } from "../../../components/data/StatusBadge";
import { Button } from "../../../components/ui/Button";
import { CorrectionBadge } from "../CorrectionBadge";
import { canRequestCorrection, formatHours } from "../attendance";
import { getEmployees } from "../../../data/mock/repositories";
import type { Attendance, Role } from "../../../types";

interface TodayTabProps {
  records: Attendance[]; // today's records, already scoped to the role
  role: Role;
  userId: string;
  onRequestCorrection: (record: Attendance) => void;
}

/** §44 "Today" tab: per-employee status for the current day. */
export function TodayTab({ records, role, userId, onRequestCorrection }: TodayTabProps) {
  const employeeMap = new Map(getEmployees().map((e) => [e.id, `${e.firstName} ${e.lastName}`]));

  return (
    <DataTable
      data={records}
      keyExtractor={(r) => r.id}
      columns={[
        {
          key: "employee",
          header: "Employee",
          sortable: true,
          cell: (r) => (
            <span className="font-medium text-gray-900">
              {employeeMap.get(r.employeeId) ?? r.employeeId}
            </span>
          ),
        },
        { key: "status", header: "Status", sortable: true, cell: (r) => <StatusBadge status={r.status} /> },
        { key: "checkIn", header: "Check In", cell: (r) => r.checkIn ?? "—" },
        { key: "checkOut", header: "Check Out", cell: (r) => r.checkOut ?? "—" },
        { key: "hours", header: "Working Hours", cell: (r) => formatHours(r.workingHours) },
        { key: "correction", header: "Correction", cell: (r) => <CorrectionBadge record={r} /> },
        {
          key: "action",
          header: "Action",
          cell: (r) =>
            canRequestCorrection(role, userId, r) ? (
              <Button variant="secondary" size="sm" onClick={() => onRequestCorrection(r)}>
                Request Correction
              </Button>
            ) : r.correctionRequested ? (
              <span className="text-xs text-gray-500">Awaiting review</span>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            ),
        },
      ]}
      emptyState={{
        title: "No records for today",
        description: "Attendance records for the current day will appear here.",
      }}
    />
  );
}
