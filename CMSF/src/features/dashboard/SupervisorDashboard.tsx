import { useMemo } from "react";
import { FolderKanban, Users, ClipboardList, ClipboardCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/data/StatusBadge";
import { DataTable } from "../../components/tables/DataTable";
import { TimesheetSubmissionChart } from "../../components/charts/TimesheetSubmissionChart";
import {
  getProjects,
  getTimesheets,
  getAssignments,
  getDailyLogs,
} from "../../data/mock/repositories";
import { projectHealthData, projectHoursInPeriod, currentPeriod } from "./dashboardStats";

export function SupervisorDashboard() {
  const { user } = useAuth();
  const supervisorId = user?.employeeId ?? "EMP-002";

  const projects = useMemo(
    () => getProjects().filter((p) => p.managerId === supervisorId || p.supervisorId === supervisorId),
    [supervisorId]
  );
  const projectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const assignments = useMemo(() => getAssignments(), []);
  const teamAssignments = useMemo(() => assignments.filter((a) => projectIds.has(a.projectId) && a.status === "ACTIVE"), [assignments, projectIds]);
  const teamIds = useMemo(() => Array.from(new Set(teamAssignments.map((a) => a.employeeId))), [teamAssignments]);
  const timesheets = useMemo(() => getTimesheets().filter((t) => teamIds.includes(t.employeeId)), [teamIds]);
  const dailyLogs = useMemo(() => getDailyLogs(), []);
  const period = currentPeriod();

  const logsPendingReview = dailyLogs.filter(
    (d) => projectIds.has(d.projectId) && d.status === "SUBMITTED"
  ).length;
  const timesheetsNeedingReview = timesheets.filter(
    (t) => t.status === "SUBMITTED" || t.status === "IN_REVIEW"
  );
  const needingAttention = projects.filter((p) => p.health === "AT_RISK" || p.health === "DELAYED");
  const health = projectHealthData(projects);

  const reviewLogs = dailyLogs.filter((d) => projectIds.has(d.projectId) && d.status === "SUBMITTED").slice(0, 8);
  const submissionSeries = [
    {
      label: "This period",
      submitted: timesheets.filter((t) => t.periodStart === period.start && (t.status === "APPROVED" || t.status === "IN_REVIEW" || t.status === "PAID")).length,
      pending: timesheetsNeedingReview.filter((t) => t.periodStart === period.start).length,
    },
  ];

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Supervisor Workspace" subtitle="Project oversight and operational monitoring" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Assigned Projects" value={projects.length} icon={<FolderKanban size={20} />} variant="info" />
        <StatCard label="Team Members" value={teamIds.length} icon={<Users size={20} />} />
        <StatCard label="Logs Pending Review" value={logsPendingReview} icon={<ClipboardList size={20} />} variant="warning" />
        <StatCard label="Timesheets Needing Review" value={timesheetsNeedingReview.length} icon={<ClipboardCheck size={20} />} variant="warning" />
        <StatCard label="Needs Attention" value={needingAttention.length} icon={<AlertTriangle size={20} />} variant="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="My Projects" className="lg:col-span-2">
          <DataTable
            data={projects}
            keyExtractor={(p) => p.id}
            emptyState={{ title: "No assigned projects" }}
            columns={[
              { key: "name", header: "Project", cell: (p) => <span className="font-medium text-gray-900">{p.name}</span> },
              { key: "clientName", header: "Client", cell: (p) => p.clientName },
              { key: "teamSize", header: "Team Size", cell: (p) => p.teamSize },
              { key: "progress", header: "Progress", cell: (p) => `${p.progress}%` },
              { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} label={p.status} /> },
              { key: "hours", header: "Hours (Period)", cell: (p) => `${projectHoursInPeriod(dailyLogs, p.id, period)} h` },
            ]}
          />
        </SectionCard>

        <SectionCard title="Daily Logs Requiring Review" className="lg:col-span-2">
          <DataTable
            data={reviewLogs}
            keyExtractor={(d) => d.id}
            emptyState={{ title: "No daily logs pending review" }}
            columns={[
              { key: "workDate", header: "Date", cell: (d) => d.workDate },
              { key: "employeeName", header: "Employee", cell: (d) => <span className="font-medium text-gray-900">{d.employeeName}</span> },
              { key: "projectName", header: "Project", cell: (d) => d.projectName },
              { key: "hours", header: "Hours", cell: (d) => `${d.totalHours} h` },
              { key: "status", header: "Status", cell: (d) => <StatusBadge status={d.status} label={d.status} /> },
            ]}
          />
        </SectionCard>

        <SectionCard title="Team Timesheets" contentClassName="h-64">
          <TimesheetSubmissionChart data={submissionSeries} />
        </SectionCard>

        <SectionCard title="Project Health">
          <div className="grid grid-cols-2 gap-3">
            {health.map((h) => (
              <div key={h.name} className="rounded-md border border-gray-200 p-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{h.name}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{h.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" className="lg:col-span-2">
          <RecentActivity />
        </SectionCard>
      </div>
    </div>
  );
}

function RecentActivity() {
  const logs = useMemo(() => getDailyLogs().slice(-6).reverse(), []);
  if (logs.length === 0) return <p className="text-sm text-gray-500">No recent activity.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {logs.map((d) => (
        <li key={d.id} className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-gray-900">{d.employeeName} logged {d.totalHours}h to {d.projectName}</p>
            <p className="text-xs text-gray-500">{d.dayOfWeek}, {d.workDate}</p>
          </div>
          <StatusBadge status={d.status} label={d.status} />
        </li>
      ))}
    </ul>
  );
}
