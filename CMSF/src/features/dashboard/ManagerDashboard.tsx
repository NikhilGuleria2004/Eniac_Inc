import { useMemo } from "react";
import { FolderKanban, Users, Clock, ClipboardCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Progress } from "../../components/ui/Progress";
import { DataTable } from "../../components/tables/DataTable";
import { TimesheetSubmissionChart } from "../../components/charts/TimesheetSubmissionChart";
import { ResourceUtilizationChart } from "../../components/charts/ResourceUtilizationChart";
import {
  getProjects,
  getEmployees,
  getTimesheets,
  getInvoices,
  getAssignments,
  getDailyLogs,
  getClientById,
} from "../../data/mock/repositories";
import { formatNumber } from "../../lib/charts";
import {
  unbilledHours,
  projectHealthData,
  resourceAllocationRows,
  hoursInPeriod,
  projectHoursInPeriod,
  currentPeriod,
} from "./dashboardStats";

export function ManagerDashboard() {
  const { user } = useAuth();
  const managerId = user?.employeeId ?? "EMP-001";

  const projects = useMemo(() => getProjects().filter((p) => p.managerId === managerId || p.supervisorId === managerId), [managerId]);
  const assignments = useMemo(() => getAssignments(), []);
  const employees = useMemo(() => getEmployees(), []);
  const timesheets = useMemo(() => getTimesheets(), []);
  const invoices = useMemo(() => getInvoices(), []);
  const dailyLogs = useMemo(() => getDailyLogs(), []);
  const period = currentPeriod();

  const projectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const teamAssignments = useMemo(() => assignments.filter((a) => projectIds.has(a.projectId) && a.status === "ACTIVE"), [assignments, projectIds]);
  const teamIds = useMemo(() => Array.from(new Set(teamAssignments.map((a) => a.employeeId))), [teamAssignments]);
  const teamEmployees = useMemo(() => employees.filter((e) => teamIds.includes(e.id)), [employees, teamIds]);
  const teamTimesheets = useMemo(() => timesheets.filter((t) => teamIds.includes(t.employeeId)), [timesheets, teamIds]);

  const myClients = useMemo(() => new Set(projects.map((p) => p.clientId)).size, [projects]);
  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const unbilled = unbilledHours(teamTimesheets, invoices);
  const pendingReviews = teamTimesheets.filter((t) => t.status === "SUBMITTED" || t.status === "IN_REVIEW").length;
  const atRisk = projects.filter((p) => p.health === "AT_RISK" || p.health === "DELAYED").length;

  const health = projectHealthData(projects);
  const allocation = resourceAllocationRows(employees, teamAssignments, projects, dailyLogs, period);
  const utilization = allocation.slice(0, 8).map((r) => ({ name: r.employee, allocation: r.allocation, billableHours: r.hoursThisPeriod }));
  const submissionSeries = buildSubmissionSeries(period);

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Manager Workspace" subtitle="Your clients, projects and team timesheet status" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="My Clients" value={myClients} icon={<Users size={20} />} variant="info" />
        <StatCard label="Active Projects" value={activeProjects} icon={<FolderKanban size={20} />} variant="info" supporting={`${projects.length} projects`} />
        <StatCard label="Team Members" value={teamEmployees.length} icon={<Users size={20} />} />
        <StatCard label="Unbilled Hours" value={`${formatNumber(Math.round(unbilled))} h`} icon={<Clock size={20} />} variant="warning" supporting="approved, not invoiced" />
        <StatCard label="Pending Reviews" value={pendingReviews} icon={<ClipboardCheck size={20} />} variant="warning" supporting="timesheets to review" />
        <StatCard label="Projects At Risk" value={atRisk} icon={<AlertTriangle size={20} />} variant="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="My Projects" className="lg:col-span-2">
          <DataTable
            data={projects}
            keyExtractor={(p) => p.id}
            emptyState={{ title: "No projects" }}
            columns={[
              { key: "name", header: "Project", cell: (p) => <span className="font-medium text-gray-900">{p.name}</span> },
              { key: "clientName", header: "Client", cell: (p) => p.clientName },
              { key: "teamSize", header: "Team Size", cell: (p) => p.teamSize },
              { key: "progress", header: "Progress", cell: (p) => (
                <div className="w-28">
                  <Progress value={p.progress} showLabel />
                </div>
              ) },
              { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} label={p.status} /> },
              { key: "health", header: "Health", cell: (p) => <HealthBadge health={p.health} /> },
              { key: "hours", header: "Hours (Period)", cell: (p) => `${projectHoursInPeriod(dailyLogs, p.id, period)} h` },
            ]}
          />
        </SectionCard>

        <SectionCard title="Team Timesheet Status" className="lg:col-span-2">
          <DataTable
            data={teamEmployees}
            keyExtractor={(e) => e.id}
            emptyState={{ title: "No team members" }}
            columns={[
              { key: "name", header: "Employee", cell: (e) => <span className="font-medium text-gray-900">{`${e.firstName} ${e.lastName}`}</span> },
              { key: "project", header: "Project", cell: (e) => teamAssignments.find((a) => a.employeeId === e.id)?.projectId ? projects.find((p) => p.id === teamAssignments.find((a) => a.employeeId === e.id)?.projectId)?.name ?? "—" : "—" },
              { key: "hours", header: "Billable Hours", cell: (e) => `${hoursInPeriod(dailyLogs, e.id, period)} h` },
              { key: "submitted", header: "Submitted", cell: (e) => {
                const ts = timesheets.find((t) => t.employeeId === e.id && t.periodStart === period.start);
                return ts ? <StatusBadge status={ts.status} kind="timesheet" /> : <span className="text-gray-400">Not started</span>;
              } },
              { key: "status", header: "Status", cell: (e) => {
                const ts = timesheets.find((t) => t.employeeId === e.id && t.periodStart === period.start);
                if (!ts) return <span className="text-gray-400">—</span>;
                return ts.status === "SUBMITTED" || ts.status === "IN_REVIEW"
                  ? <span className="text-warning text-xs font-medium">Needs review</span>
                  : <span className="text-success text-xs font-medium">On time</span>;
              } },
            ]}
          />
        </SectionCard>

        <SectionCard title="Timesheet Submissions" contentClassName="h-64">
          <TimesheetSubmissionChart data={submissionSeries} />
        </SectionCard>

        <SectionCard title="Resource Allocation" contentClassName="h-64">
          <ResourceUtilizationChart data={utilization} />
        </SectionCard>

        <SectionCard title="Recent Client Activity">
          <ClientActivityList />
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
      </div>
    </div>
  );
}

function ClientActivityList() {
  const projects = useMemo(() => getProjects(), []);
  const clients = useMemo(
    () =>
      Array.from(new Set(projects.map((p) => p.clientId)))
        .map((id) => getClientById(id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .slice(0, 6),
    [projects]
  );

  if (clients.length === 0) return <p className="text-sm text-gray-500">No client activity.</p>;

  return (
    <ul className="divide-y divide-gray-100">
      {clients.map((c) => (
        <li key={c.id} className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-900">{c.name}</p>
            <p className="text-xs text-gray-500">{c.activeProjectCount} active project(s)</p>
          </div>
          <StatusBadge status={c.status} label={c.status} />
        </li>
      ))}
    </ul>
  );
}

function buildSubmissionSeries(period: { start: string; end: string }) {
  const timesheets = getTimesheets();
  const submitted = timesheets.filter((t) => t.periodStart === period.start && (t.status === "APPROVED" || t.status === "PAID" || t.status === "IN_REVIEW")).length;
  const pending = timesheets.filter((t) => t.periodStart === period.start && (t.status === "SUBMITTED" || t.status === "DRAFT" || t.status === "REJECTED")).length;
  return [{ label: "This period", submitted, pending }];
}

function HealthBadge({ health }: { health: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ON_TRACK: { label: "On Track", cls: "badge-success" },
    AT_RISK: { label: "At Risk", cls: "badge-warning" },
    DELAYED: { label: "Delayed", cls: "badge-danger" },
    COMPLETED: { label: "Completed", cls: "badge-neutral" },
  };
  const h = map[health] ?? { label: health, cls: "badge-neutral" };
  return <span className={`badge ${h.cls}`}>{h.label}</span>;
}
