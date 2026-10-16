import { useMemo } from "react";
import { Users, Briefcase, BarChart3, Clock, TrendingUp } from "lucide-react";
import { StatusDistributionChart } from "../../components/charts/StatusDistributionChart";
import { WorkforceChart } from "../../components/charts/WorkforceChart";
import { LeaveStatusChart } from "../../components/charts/LeaveStatusChart";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { getEmployees, getProjects, getAssignments, getLeaveRequests } from "../../data/mock/repositories";
import {
  EMPLOYEE_STATUS_COLORS,
  PROJECT_STATUS_COLORS,
  ASSIGNMENT_STATUS_COLORS,
  CHART_FALLBACK_COLOR,
} from "../../components/charts/palette";
import { computeAnalyticsKPIs } from "./analytics";
import { ROUTES } from "../../data/constants";
import type { Employee, Project, ProjectAssignment } from "../../types";

function StatCard({ label, value, icon, variant = "default" }: { label: string; value: string | number; icon: React.ReactNode; variant?: "default" | "success" | "warning" | "neutral" | "info" }) {
  const bgColors = { default: "bg-gray-50", success: "bg-green-50", warning: "bg-yellow-50", neutral: "bg-gray-100", info: "bg-blue-50" };
  const textColors = { default: "text-gray-900", success: "text-green-700", warning: "text-yellow-700", neutral: "text-gray-700", info: "text-blue-700" };
  return (
    <div className={`card ${bgColors[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-semibold ${textColors[variant]} mt-1`}>{value}</p>
        </div>
        <div className={textColors[variant]}>{icon}</div>
      </div>
    </div>
  );
}

function computeWorkforceData(employees: Employee[]) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = (currentMonth - 11 + i + 12) % 12;
    const year = currentYear + Math.floor((currentMonth - 11 + i) / 12);
    return { month: monthIndex, year, label: new Date(year, monthIndex, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
  });

  return months.map(({ month, year, label }) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    const monthStartISO = monthStart.toISOString().split("T")[0];
    const monthEndISO = monthEnd.toISOString().split("T")[0];

    const headcount = employees.filter((e) => {
      const joinDate = new Date(e.joiningDate);
      return joinDate <= monthEnd && e.employmentStatus !== "TERMINATED" && e.employmentStatus !== "RESIGNED" && e.employmentStatus !== "INACTIVE";
    }).length;

    const newHires = employees.filter((e) => {
      const joinDate = e.joiningDate.split("T")[0];
      return joinDate >= monthStartISO && joinDate <= monthEndISO;
    }).length;

    const exits = employees.filter((e) => {
      if (e.employmentStatus !== "TERMINATED" && e.employmentStatus !== "RESIGNED") return false;
      const exitDate = e.updatedAt.split("T")[0];
      return exitDate >= monthStartISO && exitDate <= monthEndISO;
    }).length;

    return { month: label, headcount, newHires, exits };
  });
}

function computeStatusData(employees: Employee[]) {
  const statusCounts = employees.reduce((acc, e) => {
    acc[e.employmentStatus] = (acc[e.employmentStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    fill: EMPLOYEE_STATUS_COLORS[status] || CHART_FALLBACK_COLOR,
  }));
}

function computeProjectStatusData(projects: Project[]) {
  const statusCounts = projects.filter((p) => p.status !== "CANCELLED").reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    fill: PROJECT_STATUS_COLORS[status] || CHART_FALLBACK_COLOR,
  }));
}

function computeAssignmentStatusData(assignments: ProjectAssignment[]) {
  const statusCounts = assignments.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    fill: ASSIGNMENT_STATUS_COLORS[status] || CHART_FALLBACK_COLOR,
  }));
}

export function AnalyticsDashboardPage() {
  const kpis = useMemo(() => computeAnalyticsKPIs(), []);

  const employees = useMemo(() => getEmployees(), []);
  const projects = useMemo(() => getProjects(), []);
  const assignments = useMemo(() => getAssignments(), []);
  const leaveRequests = useMemo(() => getLeaveRequests(), []);

  const workforceData = useMemo(() => computeWorkforceData(employees), [employees]);
  const employeeStatusData = useMemo(() => computeStatusData(employees), [employees]);
  const projectStatusData = useMemo(() => computeProjectStatusData(projects), [projects]);
  const assignmentStatusData = useMemo(() => computeAssignmentStatusData(assignments), [assignments]);

  const leaveTypeCounts = useMemo(
    () =>
      leaveRequests.reduce((acc, l) => {
        acc[l.type] = (acc[l.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [leaveRequests]
  );

  const leaveStatusCounts = useMemo(
    () =>
      leaveRequests.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    [leaveRequests]
  );

  const billableVsNonBillable = useMemo(() => {
    const billable = employees.filter((e) => e.billingStatus === "BILLABLE").length;
    const nonBillable = employees.filter((e) => e.billingStatus === "NON_BILLABLE").length;
    return { billable, nonBillable };
  }, [employees]);

  const topProjects = useMemo(() => {
    return projects
      .filter((p) => p.status !== "CANCELLED")
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);
  }, [projects]);

  const topProjectsColumns = [
    {
      key: "name",
      header: "Project",
      cell: (row: Project) => (
        <a href={ROUTES.PROJECT_DETAIL(row.id)} className="font-medium text-gray-900 hover:text-accent">
          {row.name}
        </a>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      cell: (row: Project) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${row.progress}%` }} />
          </div>
          <span className="text-sm text-gray-600">{row.progress}%</span>
        </div>
      ),
    },
    { key: "teamSize", header: "Team", cell: (row: Project) => row.teamSize },
    { key: "status", header: "Status", cell: (row: Project) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Enterprise metrics and insights across all modules</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={kpis.totalEmployees} icon={<Users aria-hidden="true" size={20} />} />
        <StatCard label="Active Projects" value={kpis.totalProjects} icon={<Briefcase aria-hidden="true" size={20} />} variant="success" />
        <StatCard label="Total Clients" value={kpis.totalClients} icon={<Users aria-hidden="true" size={20} />} variant="info" />
        <StatCard label="Active Assignments" value={kpis.activeAssignments} icon={<BarChart3 aria-hidden="true" size={20} />} />
        <StatCard label="Billable Allocation" value={`${kpis.billableAllocation}%`} icon={<BarChart3 aria-hidden="true" size={20} />} variant="success" />
        <StatCard label="Total Hours" value={kpis.totalHours.toLocaleString()} icon={<Clock aria-hidden="true" size={20} />} />
        <StatCard label="Pending Leave" value={kpis.pendingLeave} icon={<Clock aria-hidden="true" size={20} />} variant="warning" />
        <StatCard label="Pending Reviews" value={kpis.pendingReviews} icon={<TrendingUp aria-hidden="true" size={20} />} variant="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Workforce Overview (Last 12 Months)</h3>
          <div className="h-64">
            <WorkforceChart data={workforceData} />
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Employee Status Distribution</h3>
          <div className="h-64">
            <StatusDistributionChart data={employeeStatusData} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Project Status Distribution</h3>
          <div className="h-64">
            <StatusDistributionChart data={projectStatusData} />
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Assignment Status Distribution</h3>
          <div className="h-64">
            <StatusDistributionChart data={assignmentStatusData} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Leave Analytics</h3>
          <LeaveStatusChart leaveTypeCounts={leaveTypeCounts} leaveStatusCounts={leaveStatusCounts} />
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Billing Distribution</h3>
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{billableVsNonBillable.billable}</div>
                  <div className="text-xs text-gray-500 mt-1">Billable</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-600">{billableVsNonBillable.nonBillable}</div>
                  <div className="text-xs text-gray-500 mt-1">Non-Billable</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Projects by Progress</h3>
        <DataTable
          data={topProjects}
          columns={topProjectsColumns}
          keyExtractor={(row) => row.id}
          emptyState={{ title: "No projects found" }}
        />
      </div>
    </div>
  );
}
