import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/data/StatCard";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Alert } from "../../components/ui/Alert";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../auth/AuthContext";
import { AttendanceCalendar } from "./AttendanceCalendar";
import { CorrectionBadge } from "./CorrectionBadge";
import {
  getToday,
  getEmployeeSummary,
  formatHours,
  canRequestCorrection,
} from "./attendance";
import {
  getEmployeeById,
  getAttendanceByEmployee,
  requestAttendanceCorrection,
} from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import type { Attendance } from "../../types";

type Flash = { type: "success" | "error"; message: string } | null;

export function AttendanceDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const userId = user?.id ?? "";
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useState<Flash>(null);
  const today = useMemo(() => getToday(), []);
  const [year, setYear] = useState(() => Number(getToday().slice(0, 4)));
  const [month, setMonth] = useState(() => Number(getToday().slice(5, 7)) - 1);

  const employee = employeeId ? getEmployeeById(employeeId) : undefined;
  const records = useMemo(
    () => (employeeId ? getAttendanceByEmployee(employeeId) : []),
    [employeeId, version],
  );
  const summary = useMemo(() => getEmployeeSummary(records), [records]);

  // §18: employees may only view their own attendance.
  if (role === "EMPLOYEE" && employeeId !== userId) {
    return <Navigate to={ROUTES.ATTENDANCE} replace />;
  }
  if (!employee) {
    return (
      <div className="page-container">
        <PageHeader title="Attendance Detail" breadcrumbs={[{ label: "Attendance", href: ROUTES.ATTENDANCE }, { label: "Not found" }]} />
        <EmptyState
          title="Employee not found"
          description="This employee does not exist."
          action={<Link to={ROUTES.ATTENDANCE} className="btn btn-secondary">Back to Attendance</Link>}
        />
      </div>
    );
  }

  const handleRequestCorrection = (record: Attendance) => {
    const updated = requestAttendanceCorrection(record.id);
    if (updated) {
      setFlash({ type: "success", message: `Correction requested for ${record.date}.` });
    } else {
      setFlash({ type: "error", message: "Could not request a correction for this record." });
    }
    setVersion((v) => v + 1);
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="page-container">
      <PageHeader
        title={`Attendance — ${employee.firstName} ${employee.lastName}`}
        description={`${employee.employeeCode} · My Attendance (${today})`}
        breadcrumbs={[{ label: "Attendance", href: ROUTES.ATTENDANCE }, { label: `${employee.firstName} ${employee.lastName}` }]}
        actions={<Link to={ROUTES.ATTENDANCE} className="btn btn-secondary">Back to Dashboard</Link>}
      />

      {flash && (
        <Alert variant={flash.type} className="mb-4">{flash.message}</Alert>
      )}

      {/* §32 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Present" value={summary.present} />
        <StatCard label="Absent" value={summary.absent} />
        <StatCard label="Late" value={summary.late} />
        <StatCard label="Leave" value={summary.leave} />
        <StatCard label="Missing" value={summary.missing} />
      </div>

      <div className="mb-6">
        <AttendanceCalendar year={year} month={month} records={records} onPrevMonth={prevMonth} onNextMonth={nextMonth} />
      </div>

      <DataTable
        data={sorted}
        keyExtractor={(r) => r.id}
        columns={[
          { key: "date", header: "Date", sortable: true, cell: (r) => <span className="text-gray-900">{r.date}</span> },
          { key: "checkIn", header: "Check In", cell: (r) => r.checkIn ?? "—" },
          { key: "checkOut", header: "Check Out", cell: (r) => r.checkOut ?? "—" },
          { key: "hours", header: "Working Hours", sortable: true, cell: (r) => formatHours(r.workingHours) },
          { key: "status", header: "Status", sortable: true, cell: (r) => <StatusBadge status={r.status} /> },
          { key: "correction", header: "Correction", cell: (r) => <CorrectionBadge record={r} /> },
          {
            key: "action",
            header: "Action",
            cell: (r) =>
              canRequestCorrection(role, userId, r) ? (
                <Button variant="secondary" size="sm" onClick={() => handleRequestCorrection(r)}>
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
          title: "No attendance records",
          description: "This employee has no attendance records yet.",
        }}
      />
    </div>
  );
}
