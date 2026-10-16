import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, FileText, Send, Layers } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Progress } from "../../components/ui/Progress";
import { StatusBadge } from "../../components/data/StatusBadge";
import { DataTable } from "../../components/tables/DataTable";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import {
  getTimesheetsByEmployee,
  getDailyLogs,
  submitTimesheet,
  compileTimesheet,
} from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { formatCurrency } from "../../lib/charts";
import { getCurrentBillingPeriod } from "../../lib/utils";
import { canSubmit, isOverdue } from "./timesheets";

export function MyTimesheetsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const employeeId = user?.employeeId ?? "EMP-005";
  const period = getCurrentBillingPeriod();

  const timesheets = useMemo(
    () => getTimesheetsByEmployee(employeeId).slice().sort((a, b) => (a.periodStart < b.periodStart ? 1 : -1)),
    [employeeId]
  );
  const periodLogs = useMemo(
    () => getDailyLogs().filter((d) => d.employeeId === employeeId && d.workDate >= period.start && d.workDate <= period.end),
    [employeeId, period.start, period.end]
  );

  const current = timesheets.find((t) => t.periodStart === period.start && t.periodEnd === period.end);
  const submittedLogs = periodLogs.filter((d) => d.status === "SUBMITTED").length;
  const today = new Date().toISOString().slice(0, 10);
  const totalDays = Number(period.end.slice(8, 10)) - Number(period.start.slice(8, 10)) + 1;
  const elapsed = Math.max(0, Number(today.slice(8, 10)) - Number(period.start.slice(8, 10)) + 1);
  const daysRemaining = Math.max(0, totalDays - elapsed);
  const readyToSubmit = canSubmit(current?.status ?? "DRAFT") && submittedLogs > 0;

  const handleCompile = () => {
    const ts = compileTimesheet(employeeId, period);
    addToast(ts ? "success" : "warning", ts ? "Timesheet compiled from daily logs" : "No submitted daily logs to compile");
  };

  const handleSubmit = () => {
    if (!current) return;
    const result = submitTimesheet(current.id, `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim());
    addToast(result ? "success" : "error", result ? "Timesheet submitted for review" : "Timesheet cannot be submitted");
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader title="My Timesheets" subtitle="View and submit your timesheet entries" />

      <div className="card space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-institutional text-gray-700"><CalendarDays size={22} /></span>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Current Period</p>
              <p className="text-lg font-semibold text-gray-900">{period.label}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Days Remaining: <span className="font-medium text-gray-900">{daysRemaining}</span></p>
        </div>
        <Progress value={elapsed} max={totalDays} showLabel />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={() => navigate(ROUTES.DAILY_LOGS)}><FileText size={16} className="mr-2" />View Daily Logs</button>
          {!current && submittedLogs > 0 && (
            <button className="btn btn-secondary" onClick={handleCompile}><Layers size={16} className="mr-2" />Compile Timesheet</button>
          )}
          {current && readyToSubmit && (
            <button className="btn btn-primary" onClick={handleSubmit}><Send size={16} className="mr-2" />Submit for Review</button>
          )}
        </div>
      </div>

      <div className="card">
        <DataTable
          data={timesheets}
          keyExtractor={(t) => t.id}
          onRowClick={(t) => navigate(ROUTES.TIMESHEET_DETAIL.replace(":timesheetId", t.id))}
          emptyState={{ title: "No timesheets yet", description: "Log hours to compile your first timesheet." }}
          columns={[
            { key: "periodLabel", header: "Period", cell: (t) => <span className="font-medium text-gray-900">{t.periodLabel}</span> },
            { key: "range", header: "Start - End", cell: (t) => `${t.periodStart} - ${t.periodEnd}` },
            { key: "totalHours", header: "Total Hours", cell: (t) => `${t.totalHours} h` },
            { key: "totalBillableHours", header: "Billable Hours", cell: (t) => `${t.totalBillableHours} h` },
            { key: "billableAmount", header: "Billable Amount", cell: (t) => formatCurrency(t.billableAmount, t.currency) },
            { key: "status", header: "Status", cell: (t) => (isOverdue(t) ? <span className="badge badge-warning">Overdue</span> : <StatusBadge status={t.status} kind="timesheet" />) },
            { key: "submittedAt", header: "Submitted", cell: (t) => (t.submittedAt ? new Date(t.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—") },
            { key: "actions", header: "Actions", cell: (t) => (
              <button className="text-accent hover:underline text-sm" onClick={(e) => { e.stopPropagation(); navigate(ROUTES.TIMESHEET_DETAIL.replace(":timesheetId", t.id)); }}>View</button>
            ) },
          ]}
        />
      </div>
    </div>
  );
}
