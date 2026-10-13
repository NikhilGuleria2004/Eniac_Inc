import { DataTable } from "../../../components/tables/DataTable";
import { formatHours, getEmployeeAttendanceStats } from "../attendance";
import { getEmployees } from "../../../data/mock/repositories";
import type { Attendance } from "../../../types";

interface ReportsTabProps {
  records: Attendance[]; // already scoped to the role
}

/** §44 "Reports" tab: monthly attendance report (per-employee aggregates). */
export function ReportsTab({ records }: ReportsTabProps) {
  const employees = getEmployees();
  const nameOf = (id: string) => {
    const e = employees.find((emp) => emp.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  };
  const stats = getEmployeeAttendanceStats(employees, records)
    .filter((s) => s.total > 0)
    .map((s) => ({
      ...s,
      employee: nameOf(s.employeeId),
      avgHours: s.total > 0 ? Math.round((s.totalHours / s.total) * 100) / 100 : 0,
    }));

  const totals = stats.reduce(
    (acc, s) => ({
      days: acc.days + s.total,
      present: acc.present + s.present,
      late: acc.late + s.late,
      absent: acc.absent + s.absent,
      leave: acc.leave + s.leave,
      missing: acc.missing + s.missing,
      hours: acc.hours + s.totalHours,
    }),
    { days: 0, present: 0, late: 0, absent: 0, leave: 0, missing: 0, hours: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="card bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Attendance Totals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
          <div><p className="text-xs text-gray-500">Days</p><p className="font-semibold">{totals.days}</p></div>
          <div><p className="text-xs text-gray-500">Present</p><p className="font-semibold text-green-700">{totals.present}</p></div>
          <div><p className="text-xs text-gray-500">Late</p><p className="font-semibold text-amber-700">{totals.late}</p></div>
          <div><p className="text-xs text-gray-500">Absent</p><p className="font-semibold text-red-700">{totals.absent}</p></div>
          <div><p className="text-xs text-gray-500">Leave</p><p className="font-semibold text-blue-700">{totals.leave}</p></div>
          <div><p className="text-xs text-gray-500">Missing</p><p className="font-semibold text-gray-600">{totals.missing}</p></div>
          <div><p className="text-xs text-gray-500">Total Hours</p><p className="font-semibold">{totals.hours.toFixed(2)}</p></div>
        </div>
      </div>

      <DataTable
        data={stats}
        keyExtractor={(s) => s.employeeId}
        columns={[
          { key: "employee", header: "Employee", sortable: true, cell: (s) => <span className="font-medium text-gray-900">{s.employee}</span> },
          { key: "total", header: "Days", sortable: true },
          { key: "present", header: "Present", sortable: true },
          { key: "late", header: "Late", sortable: true },
          { key: "absent", header: "Absent", sortable: true },
          { key: "leave", header: "Leave", sortable: true },
          { key: "missing", header: "Missing", sortable: true },
          { key: "totalHours", header: "Total Hours", sortable: true, cell: (s) => formatHours(s.totalHours) },
          { key: "avgHours", header: "Avg Hours/Day", sortable: true, cell: (s) => formatHours(s.avgHours) },
        ]}
        emptyState={{
          title: "No attendance data",
          description: "No attendance records are available for the selected scope.",
        }}
      />
    </div>
  );
}
