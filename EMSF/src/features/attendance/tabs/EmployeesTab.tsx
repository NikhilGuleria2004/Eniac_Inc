import { Link } from "react-router-dom";
import { DataTable } from "../../../components/tables/DataTable";
import { formatHours, getEmployeeAttendanceStats } from "../attendance";
import { getEmployees } from "../../../data/mock/repositories";
import { ROUTES } from "../../../data/constants";
import type { Attendance } from "../../../types";

interface EmployeesTabProps {
  records: Attendance[]; // already scoped to the role
}

/** §44 "Employees" tab: per-employee attendance table with drill-down. */
export function EmployeesTab({ records }: EmployeesTabProps) {
  const employees = getEmployees();
  const nameOf = (id: string) => {
    const e = employees.find((emp) => emp.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  };
  const stats = getEmployeeAttendanceStats(employees, records).map((s) => ({
    ...s,
    employee: nameOf(s.employeeId),
    avgHours: s.total > 0 ? Math.round((s.totalHours / s.total) * 100) / 100 : 0,
  }));

  return (
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
        { key: "avgHours", header: "Avg Hours", sortable: true, cell: (s) => formatHours(s.avgHours) },
        { key: "lastDate", header: "Last Attendance", sortable: true, cell: (s) => s.lastDate ?? "—" },
        {
          key: "action",
          header: "Action",
          cell: (s) => (
            <Link to={ROUTES.ATTENDANCE_DETAIL(s.employeeId)} className="btn btn-secondary btn-sm">
              View
            </Link>
          ),
        },
      ]}
      emptyState={{ title: "No employees", description: "Employee roster is empty." }}
    />
  );
}
