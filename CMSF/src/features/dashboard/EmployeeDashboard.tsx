import { useMemo, useState } from "react";
import { CalendarDays, Plus, FolderKanban } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { PageHeader } from "../../components/layout/PageHeader";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Progress } from "../../components/ui/Progress";
import { DataTable } from "../../components/tables/DataTable";
import { DailyLogFormModal } from "../dailylogs/DailyLogFormModal";
import {
  getProjects,
  getAssignments,
  getDailyLogs,
  getTimesheets,
  getNotificationsByUser,
} from "../../data/mock/repositories";
import type { Project, ProjectAssignment } from "../../types";
import {
  currentPeriod,
  hoursInPeriod,
  billableHoursInPeriod,
  workingDaysInPeriod,
} from "./dashboardStats";

export function EmployeeDashboard() {
  const { user } = useAuth();
  const employeeId = user?.employeeId ?? "EMP-005";
  const [logOpen, setLogOpen] = useState(false);

  const period = currentPeriod();
  const assignments = useMemo(() => getAssignments().filter((a) => a.employeeId === employeeId && a.status === "ACTIVE"), [employeeId]);
  const projects = useMemo(() => getProjects(), []);
  const dailyLogs = useMemo(() => getDailyLogs().filter((d) => d.employeeId === employeeId), [employeeId]);
  const timesheets = useMemo(() => getTimesheets(), []);
  const notifications = useMemo(() => getNotificationsByUser(employeeId), [employeeId]);

  const currentTs = timesheets.find((t) => t.employeeId === employeeId && t.periodStart === period.start);
  const logged = hoursInPeriod(dailyLogs, employeeId, period);
  const billable = billableHoursInPeriod(dailyLogs, employeeId, period);
  const targetHours = workingDaysInPeriod(period) * 8;

  const myProjects = assignments
    .map((a) => ({ assignment: a, proj: projects.find((p) => p.id === a.projectId) }))
    .filter((x): x is { assignment: ProjectAssignment; proj: Project } => Boolean(x.proj));

  const recentLogs = [...dailyLogs]
    .filter((d) => d.workDate >= period.start && d.workDate <= period.end)
    .sort((a, b) => (a.workDate < b.workDate ? 1 : -1))
    .slice(0, 6);

  const firstName = user?.firstName ?? "Employee";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Timesheet & Project Portal" subtitle={`Welcome back, ${firstName}`} />

      <div className="flex items-center gap-3 card">
        <CalendarDays size={20} className="text-accent" />
        <div>
          <p className="text-sm font-medium text-gray-900">Today's Date</p>
          <p className="text-xs text-gray-500">{today}</p>
        </div>
        <div className="ml-auto">
          <p className="text-xs text-gray-500">Current Billing Period</p>
          <p className="text-sm font-medium text-gray-900">{period.label}</p>
        </div>
      </div>

      <SectionCard
        title="My Current Projects"
        action={
          <button onClick={() => setLogOpen(true)} className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Log Hours
          </button>
        }
      >
        {myProjects.length === 0 ? (
          <p className="text-sm text-gray-500">No active project assignments.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myProjects.map(({ assignment, proj }) => (
              <div key={assignment.id} className="rounded-md border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{proj.name}</p>
                    <p className="text-xs text-gray-500">{proj.clientName}</p>
                  </div>
                  <FolderKanban size={18} className="text-gray-400" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <p>Role: <span className="text-gray-900">{assignment.role}</span></p>
                  <p>Allocation: <span className="text-gray-900">{assignment.allocation}%</span></p>
                </div>
                <div className="mt-3">
                  <Progress value={proj.progress} showLabel />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="My Timesheet Status">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Current Period</span>
              <span className="font-medium text-gray-900">{period.label}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <StatusBadge status={currentTs?.status ?? "DRAFT"} kind="timesheet" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Logged Hours</span>
              <span className="font-medium text-gray-900">{logged} / {targetHours}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Billable Hours</span>
              <span className="font-medium text-gray-900">{billable}</span>
            </div>
            <Progress value={logged} max={targetHours} showLabel />
          </div>
        </SectionCard>

        <SectionCard title="My Notifications">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.slice(0, 6).map((n) => (
                <li key={n.id} className="py-2">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent Daily Logs">
        <DataTable
          data={recentLogs}
          keyExtractor={(d) => d.id}
          emptyState={{ title: "No logs this period", description: "Use Log Hours to add your first entry." }}
          columns={[
            { key: "workDate", header: "Date", cell: (d) => d.workDate },
            { key: "projectName", header: "Project", cell: (d) => d.projectName },
            { key: "totalHours", header: "Hours", cell: (d) => `${d.totalHours} h` },
            { key: "description", header: "Description", cell: (d) => <span className="text-gray-600">{d.description}</span> },
            { key: "overtimeHours", header: "Overtime", cell: (d) => (d.overtimeHours > 0 ? <span className="text-warning">{d.overtimeHours} h</span> : <span className="text-gray-400">—</span>) },
            { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} label={d.status} /> },
          ]}
        />
      </SectionCard>

      <DailyLogFormModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}
