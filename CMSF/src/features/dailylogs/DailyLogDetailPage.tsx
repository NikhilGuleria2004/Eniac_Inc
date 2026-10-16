import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { CalendarDays, Pencil, Lock } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/data/StatusBadge";
import { useAuth } from "../../features/auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { getDailyLogs, getProjects, getEmployees, getTimesheets } from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { DailyLogFormModal } from "./DailyLogFormModal";

export function DailyLogDetailPage() {
  const { logId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);

  const log = getDailyLogs().find((d) => d.id === logId);
  const locked = log
    ? getTimesheets().some((t) => (t.status === "APPROVED" || t.status === "PAID") && t.dailyLogIds.includes(log.id))
    : false;
  const project = log ? getProjects().find((p) => p.id === log.projectId) : undefined;
  const employee = log ? getEmployees().find((e) => e.id === log.employeeId) : undefined;

  if (!log) {
    return (
      <div className="page-container">
        <p className="text-sm text-gray-500">Daily log not found.</p>
        <button className="btn btn-secondary mt-4" onClick={() => navigate(ROUTES.DAILY_LOGS)}>Back to Daily Logs</button>
      </div>
    );
  }

  const canViewAll = hasPermission(user?.role ?? "EMPLOYEE", "daily_log.view_all");
  const isOwner = user?.role === "EMPLOYEE" && user?.employeeId === log.employeeId;
  if (!canViewAll && !isOwner) {
    return <Navigate to="/403" replace />;
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={`Daily Log — ${log.workDate}`}
        subtitle={log.projectName}
        actions={
          locked ? (
            <span className="flex items-center gap-2 text-sm text-gray-500"><Lock size={16} /> Locked (timesheet approved/paid)</span>
          ) : isOwner ? (
            <button className="btn btn-primary" onClick={() => setEditOpen(true)}><Pencil size={16} className="mr-2" />Edit</button>
          ) : (
            <span className="text-sm text-gray-500">View only (review via rejection)</span>
          )
        }
      />

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-2 text-gray-600"><CalendarDays size={16} className="text-gray-400" />{log.dayOfWeek}, {log.workDate}</span>
          <StatusBadge status={log.billable ? "ACTIVE" : "INACTIVE"} label={log.billingType} />
          {locked ? <StatusBadge status="CLOSED" label="Locked" /> : <StatusBadge status={log.status === "DRAFT" ? "SUSPENDED" : "ACTIVE"} label={log.status === "DRAFT" ? "Draft" : "Submitted"} />}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Employee" value={employee ? `${employee.firstName} ${employee.lastName} (${employee.employeeCode})` : log.employeeName} />
          <Field label="Project" value={`${log.projectName}${project ? ` (${project.projectCode})` : ""}`} />
          <Field label="Task Category" value={log.taskCategory.replace(/_/g, " ")} />
          <Field label="Regular Hours" value={`${log.regularHours} h`} />
          <Field label="Overtime Hours" value={`${log.overtimeHours} h`} />
          <Field label="Total Hours" value={`${log.totalHours} h`} />
        </dl>
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Work Description</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{log.description}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Activity</h2>
        <ul className="divide-y divide-gray-100 text-sm">
          <li className="flex justify-between py-2"><span className="text-gray-700">Log created</span><span className="text-gray-500">{new Date(log.createdAt).toLocaleString()}</span></li>
          <li className="flex justify-between py-2"><span className="text-gray-700">Last updated</span><span className="text-gray-500">{new Date(log.updatedAt).toLocaleString()}</span></li>
          {log.timesheetId && <li className="flex justify-between py-2"><span className="text-gray-700">Included in timesheet</span><span className="text-gray-500">{log.timesheetId}</span></li>}
        </ul>
      </div>

      {!locked && <DailyLogFormModal open={editOpen} initialData={log} onClose={() => setEditOpen(false)} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
