import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, ClipboardCheck, CheckCircle2, XCircle, Clock, AlertTriangle, Plus, Search } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Select } from "../../components/ui/Select";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { useAuth } from "../../features/auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import {
  getTimesheets,
  getEmployees,
  getProjects,
  approveTimesheet,
  rejectTimesheet,
} from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { computeTimesheetKPIs, filterTimesheets, isOverdue, canApprove, canReject } from "./timesheets";
import { TimesheetReviewModal } from "./TimesheetReviewModal";
import { CreateTimesheetModal } from "./CreateTimesheetModal";

export function TimesheetsDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [employee, setEmployee] = useState("all");
  const [project, setProject] = useState("all");
  const [status, setStatus] = useState("all");
  const [reviewer, setReviewer] = useState("all");
  const [period, setPeriod] = useState("all");
  const [reviewOpen, setReviewOpen] = useState<{ mode: "approve" | "reject"; id: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const employees = useMemo(() => getEmployees(), []);
  const projects = useMemo(() => getProjects(), []);
  const allTimesheets = useMemo(() => getTimesheets(), []);
  const timesheets = useMemo(() => {
    if (user?.role !== "SUPERVISOR") return allTimesheets;
    const myProjectIds = new Set(
      projects.filter((p) => p.supervisorId === user.employeeId || p.managerId === user.employeeId).map((p) => p.id)
    );
    return allTimesheets.filter((t) => t.projectBreakdown.some((pb) => myProjectIds.has(pb.projectId)));
  }, [allTimesheets, projects, user?.role, user?.employeeId]);
  const kpis = useMemo(() => computeTimesheetKPIs(timesheets), [timesheets]);

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`])), [employees]);
  const projectIds = useMemo(() => new Set(timesheets.flatMap((t) => t.projectBreakdown.map((pb) => pb.projectId))), [timesheets]);

  const filtered = useMemo(
    () => filterTimesheets(timesheets, { search, employee, project, status, reviewer, period }),
    [timesheets, search, employee, project, status, reviewer, period]
  );

  const canReview = hasPermission(user?.role ?? "EMPLOYEE", "timesheet.approve") || hasPermission(user?.role ?? "EMPLOYEE", "timesheet.reject");
  const canManual = user?.role === "ADMIN" || user?.role === "MANAGER";

  const statusOptions = [
    { label: "All Statuses", value: "all" },
    ...["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED", "REVISED", "PAID"].map((s) => ({ label: s.replace("_", " "), value: s })),
  ];
  const employeeOptions = [{ label: "All Employees", value: "all" }, ...Array.from(new Set(timesheets.map((t) => t.employeeId))).map((id) => ({ label: employeeMap.get(id) ?? id, value: id }))];
  const projectOptions = [{ label: "All Projects", value: "all" }, ...Array.from(projectIds).map((id) => ({ label: projects.find((p) => p.id === id)?.name ?? id, value: id }))];
  const periodOptions = [{ label: "All Periods", value: "all" }, ...Array.from(new Set(timesheets.map((t) => t.periodStart))).map((s) => ({ label: timesheets.find((t) => t.periodStart === s)?.periodLabel ?? s, value: s }))];
  const reviewerOptions = [{ label: "Any Reviewer", value: "all" }, ...Array.from(new Set(timesheets.map((t) => t.reviewedBy).filter((x): x is string => Boolean(x)))).map((r) => ({ label: r, value: r }))];
  const hasFilters = search !== "" || employee !== "all" || project !== "all" || status !== "all" || reviewer !== "all" || period !== "all";

  const reviewing = reviewOpen ? timesheets.find((t) => t.id === reviewOpen.id) ?? null : null;
  const reviewerName = user ? `${user.firstName} ${user.lastName}` : "";

  const clearFilters = () => { setSearch(""); setEmployee("all"); setProject("all"); setStatus("all"); setReviewer("all"); setPeriod("all"); };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Timesheet Management"
        subtitle="Review, approve and track bi-monthly timesheets"
        actions={
          canManual ? (
            <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} className="mr-2" />
              New Manual Entry
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Timesheets" value={kpis.total} icon={<FileText size={20} />} />
        <StatCard label="Pending Review" value={kpis.pending} icon={<ClipboardCheck size={20} />} variant="warning" />
        <StatCard label="Approved" value={kpis.approved} icon={<CheckCircle2 size={20} />} variant="success" />
        <StatCard label="Rejected" value={kpis.rejected} icon={<XCircle size={20} />} variant="danger" />
        <StatCard label="In Progress" value={kpis.inProgress} icon={<Clock size={20} />} />
        <StatCard label="Overdue" value={kpis.overdue} icon={<AlertTriangle size={20} />} variant={kpis.overdue > 0 ? "danger" : "default"} />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by employee, project, period, status..." className="form-input pl-10" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Select value={employee} onChange={(e) => setEmployee(e.target.value)}>{employeeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={project} onChange={(e) => setProject(e.target.value)}>{projectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>{periodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>{statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={reviewer} onChange={(e) => setReviewer(e.target.value)}>{reviewerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
          </div>
          {hasFilters && <button className="self-start text-sm text-accent hover:underline" onClick={clearFilters}>Clear all filters</button>}
        </div>

        <DataTable
          data={filtered}
          keyExtractor={(t) => t.id}
          onRowClick={(t) => navigate(ROUTES.TIMESHEET_DETAIL.replace(":timesheetId", t.id))}
          emptyState={{ title: "No timesheets found", description: hasFilters ? "Try adjusting your filters or search." : "No timesheets yet." }}
          columns={[
            { key: "employeeName", header: "Employee", cell: (t) => <span className="font-medium text-gray-900">{t.employeeName}</span> },
            { key: "periodLabel", header: "Period", cell: (t) => t.periodLabel },
            { key: "project", header: "Project", cell: (t) => t.projectBreakdown.map((pb) => pb.projectName).join(", ") || "—" },
            { key: "totalHours", header: "Total Hours", cell: (t) => `${t.totalHours} h` },
            { key: "totalBillableHours", header: "Billable Hours", cell: (t) => `${t.totalBillableHours} h` },
            { key: "status", header: "Status", cell: (t) => (
              isOverdue(t) ? <span className="badge badge-warning">Overdue</span> : <StatusBadge status={t.status} kind="timesheet" />
            ) },
            { key: "submittedAt", header: "Submitted Date", cell: (t) => (t.submittedAt ? new Date(t.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—") },
            { key: "reviewedBy", header: "Reviewed By", cell: (t) => t.reviewedBy ?? "—" },
            {
              key: "actions",
              header: "Actions",
              cell: (t) => (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {canReview && canApprove(t.status) && (
                    <button className="text-success hover:underline text-sm" onClick={() => setReviewOpen({ mode: "approve", id: t.id })}>Approve</button>
                  )}
                  {canReview && canReject(t.status) && (
                    <button className="text-danger hover:underline text-sm" onClick={() => setReviewOpen({ mode: "reject", id: t.id })}>Reject</button>
                  )}
                  {(!canReview || (!canApprove(t.status) && !canReject(t.status))) && <span className="text-gray-400 text-sm">View</span>}
                </div>
              ),
            },
          ]}
        />
      </div>

      {reviewing && (
        <TimesheetReviewModal
          open={!!reviewOpen}
          timesheet={reviewing}
          mode={reviewOpen!.mode}
          reviewerName={reviewerName}
          onClose={() => setReviewOpen(null)}
          onApprove={(id, notes) => approveTimesheet(id, reviewerName, notes)}
          onReject={(id, notes) => rejectTimesheet(id, reviewerName, notes)}
        />
      )}
      <CreateTimesheetModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
