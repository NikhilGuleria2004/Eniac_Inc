import { useMemo } from "react";
import { Building2, FolderKanban, Users, UserCheck, Clock, Receipt } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/data/StatusBadge";
import { DataTable } from "../../components/tables/DataTable";
import { ClientIndustryChart } from "../../components/charts/ClientIndustryChart";
import { ProjectHealthChart } from "../../components/charts/ProjectHealthChart";
import { RevenueTrendChart } from "../../components/charts/RevenueTrendChart";
import {
  getClients,
  getProjects,
  getEmployees,
  getTimesheets,
  getInvoices,
  getAssignments,
  getDailyLogs,
  getAuditLogs,
} from "../../data/mock/repositories";
import { formatCurrency, formatNumber } from "../../lib/charts";
import { getPreviousBillingPeriods } from "../../lib/utils";
import {
  industryDistribution,
  projectHealthData,
  unbilledHours,
  outstandingInvoices,
  resourceAllocationRows,
  currentPeriod,
} from "./dashboardStats";

export function AdminDashboard() {
  const clients = useMemo(() => getClients(), []);
  const projects = useMemo(() => getProjects(), []);
  const employees = useMemo(() => getEmployees(), []);
  const timesheets = useMemo(() => getTimesheets(), []);
  const invoices = useMemo(() => getInvoices(), []);
  const assignments = useMemo(() => getAssignments(), []);
  const dailyLogs = useMemo(() => getDailyLogs(), []);
  const auditLogs = useMemo(() => getAuditLogs(), []);
  const period = currentPeriod();

  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
  const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
  const billableEmployees = employees.filter((e) => e.billingStatus === "BILLABLE" && e.employmentStatus === "ACTIVE").length;
  const unbilled = unbilledHours(timesheets, invoices);
  const outstanding = outstandingInvoices(invoices);

  const industry = useMemo(() => industryDistribution(clients), [clients]);
  const health = useMemo(() => projectHealthData(projects), [projects]);
  const revenueSeries = useMemo(() => {
    const periods = getPreviousBillingPeriods(6).reverse();
    const paid = new Map<string, number>();
    const fallback = new Map<string, number>();
    for (const inv of invoices) {
      const label = inv.periodLabel ?? "—";
      const open = inv.status !== "DRAFT" && inv.status !== "VOID" && inv.status !== "CANCELLED";
      if (open) fallback.set(label, (fallback.get(label) ?? 0) + inv.totalAmount);
      if (inv.status === "PAID") paid.set(label, (paid.get(label) ?? 0) + (inv.amountPaid || inv.totalAmount));
    }
    const usePaid = periods.some((p) => paid.has(p.label));
    return periods.map((p) => ({ label: p.label, revenue: (usePaid ? paid.get(p.label) : fallback.get(p.label)) ?? 0 }));
  }, [invoices]);
  const allocation = useMemo(
    () => resourceAllocationRows(employees, assignments, projects, dailyLogs, period),
    [employees, assignments, projects, dailyLogs, period.start, period.end]
  );

  const pendingInvoices = invoices.filter((i) => i.status === "DRAFT" || i.status === "OVERDUE").slice(0, 6);
  const recentSubmissions = timesheets
    .filter((t) => t.status === "SUBMITTED" || t.status === "IN_REVIEW")
    .slice(0, 6);
  const clientActivity = auditLogs.filter((a) => a.entity === "CLIENT").slice(0, 6);
  const recentActivity = auditLogs.slice(0, 8);

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Administration Dashboard"
        subtitle="Client management, projects, timesheets and financial overview"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active Clients" value={activeClients} icon={<Building2 size={20} />} variant="info" trend={{ direction: "up", value: "+3" }} supporting="vs last month" />
        <StatCard label="Active Projects" value={activeProjects} icon={<FolderKanban size={20} />} variant="info" supporting={`${projects.length} total`} />
        <StatCard label="Total Employees" value={employees.length} icon={<Users size={20} />} />
        <StatCard label="Billable Employees" value={billableEmployees} icon={<UserCheck size={20} />} variant="success" supporting="timesheet eligible" />
        <StatCard label="Unbilled Hours" value={`${formatNumber(Math.round(unbilled))} h`} icon={<Clock size={20} />} variant="warning" supporting="approved, not invoiced" />
        <StatCard label="Outstanding Invoices" value={outstanding.count} icon={<Receipt size={20} />} variant="danger" supporting={formatCurrency(outstanding.amount)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Client Distribution by Industry" contentClassName="h-72">
          <ClientIndustryChart data={industry} />
        </SectionCard>
        <SectionCard title="Project Health Overview" contentClassName="h-72">
          <ProjectHealthChart data={health} />
        </SectionCard>
      </div>

      <SectionCard title="Revenue Trend" subtitle="Received revenue by billing period" contentClassName="h-72">
        <RevenueTrendChart data={revenueSeries} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Pending Invoice Actions">
          {pendingInvoices.length === 0 ? (
            <p className="text-sm text-gray-500">No pending invoice actions.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pendingInvoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">{inv.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{formatCurrency(inv.balanceDue, inv.currency)}</p>
                    <StatusBadge status={inv.status} kind="invoice" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent Timesheet Submissions">
          {recentSubmissions.length === 0 ? (
            <p className="text-sm text-gray-500">No submissions awaiting review.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentSubmissions.map((ts) => (
                <li key={ts.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ts.employeeName}</p>
                    <p className="text-xs text-gray-500">{ts.periodLabel}</p>
                  </div>
                  <StatusBadge status={ts.status} kind="timesheet" />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Client Activity Feed">
          {clientActivity.length === 0 ? (
            <p className="text-sm text-gray-500">No recent client activity.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {clientActivity.map((a) => (
                <li key={a.id} className="py-2">
                  <p className="text-sm text-gray-900">{a.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(a.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Billable Resource Allocation" subtitle={`Current period: ${period.label}`}>
        <DataTable
          data={allocation}
          keyExtractor={(r) => r.id}
          emptyState={{ title: "No active allocations" }}
          columns={[
            { key: "employee", header: "Employee", cell: (r) => <span className="font-medium text-gray-900">{r.employee}</span> },
            { key: "project", header: "Current Project", cell: (r) => r.project },
            { key: "allocation", header: "Allocation", cell: (r) => `${r.allocation}%` },
            { key: "billRate", header: "Bill Rate", cell: (r) => (
              r.billable ? <span>{formatCurrency(r.billRate)}/h</span> : <span className="text-gray-400">—</span>
            ) },
            { key: "hoursThisPeriod", header: "Hours This Period", cell: (r) => r.hoursThisPeriod },
            { key: "billable", header: "Status", cell: (r) => (r.billable ? <StatusBadge status="ACTIVE" label="Billable" /> : <StatusBadge status="INACTIVE" label="Non-billable" />) },
          ]}
        />
      </SectionCard>

      <SectionCard title="Recent System Activity">
        <ul className="divide-y divide-gray-100">
          {recentActivity.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm text-gray-900">{a.description}</p>
                <p className="text-xs text-gray-500">{a.userName}</p>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(a.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
