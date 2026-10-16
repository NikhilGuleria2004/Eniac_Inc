import { useMemo } from "react";
import { DollarSign, Clock, Users, Percent, Target, CalendarClock, TrendingUp, LayoutGrid, ClipboardCheck, Layers, Building2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { RevenueTrendChart } from "../../components/charts/RevenueTrendChart";
import { ProjectHealthChart } from "../../components/charts/ProjectHealthChart";
import { TimesheetSubmissionChart } from "../../components/charts/TimesheetSubmissionChart";
import { ResourceUtilizationChart } from "../../components/charts/ResourceUtilizationChart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getInvoices, getTimesheets, getProjects, getEmployees, getClients, getAssignments, getDailyLogs } from "../../data/mock/repositories";
import { formatCurrency, chartTooltipStyle, axisTick, CHART_COLORS } from "../../lib/charts";
import { getPreviousBillingPeriods } from "../../lib/utils";
import { projectHealthData, resourceAllocationRows, currentPeriod } from "../dashboard/dashboardStats";
import type { Invoice } from "../../types";

function isOpen(inv: Invoice): boolean {
  return inv.status !== "DRAFT" && inv.status !== "VOID" && inv.status !== "CANCELLED";
}

export function AnalyticsDashboardPage() {
  const invoices = useMemo(() => getInvoices(), []);
  const timesheets = useMemo(() => getTimesheets(), []);
  const projects = useMemo(() => getProjects(), []);
  const employees = useMemo(() => getEmployees(), []);
  const clients = useMemo(() => getClients(), []);
  const assignments = useMemo(() => getAssignments(), []);
  const dailyLogs = useMemo(() => getDailyLogs(), []);

  const periods = useMemo(() => getPreviousBillingPeriods(6).reverse(), []);
  const period = currentPeriod();

  const openInvoices = invoices.filter(isOpen);
  const totalRevenue = openInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const mrr = openInvoices.filter((i) => i.issueDate.startsWith(thisMonth)).reduce((s, i) => s + i.totalAmount, 0);

  const billableHours = timesheets.filter((t) => t.status === "APPROVED" || t.status === "PAID").reduce((s, t) => s + t.totalBillableHours, 0);
  const billableCount = employees.filter((e) => e.billingStatus === "BILLABLE" && e.employmentStatus === "ACTIVE").length;
  const revenuePerEmployee = billableCount ? Math.round(totalRevenue / billableCount) : 0;
  const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
  const retention = clients.length ? Math.round((activeClients / clients.length) * 100) : 0;
  const closedProjects = projects.filter((p) => p.status !== "CANCELLED");
  const successRate = closedProjects.length ? Math.round((projects.filter((p) => p.status === "COMPLETED").length / closedProjects.length) * 100) : 0;
  const avgCycle = openInvoices.length
    ? Math.round(openInvoices.reduce((s, i) => s + Math.max(0, (new Date(`${i.dueDate}T00:00:00`).getTime() - new Date(`${i.issueDate}T00:00:00`).getTime()) / 86400000), 0) / openInvoices.length)
    : 0;

  const revenueTrend = periods.map((p) => ({
    label: p.label,
    revenue: openInvoices.filter((i) => i.periodStart === p.start).reduce((s, i) => s + (i.status === "PAID" ? i.amountPaid || i.totalAmount : i.totalAmount), 0),
  }));

  const health = projectHealthData(projects);

  const submission = periods.map((p) => {
    const inPeriod = timesheets.filter((t) => t.periodStart === p.start);
    return {
      label: p.label,
      submitted: inPeriod.filter((t) => ["APPROVED", "PAID", "IN_REVIEW"].includes(t.status)).length,
      pending: inPeriod.filter((t) => ["SUBMITTED", "DRAFT", "REJECTED"].includes(t.status)).length,
    };
  });

  const topClients = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of openInvoices) map.set(inv.clientName, (map.get(inv.clientName) ?? 0) + inv.totalAmount);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [openInvoices]);

  const utilization = useMemo(
    () => resourceAllocationRows(employees, assignments, projects, dailyLogs, period).slice(0, 8).map((r) => ({ name: r.employee, allocation: r.allocation, billableHours: r.hoursThisPeriod })),
    [employees, assignments, projects, dailyLogs, period.start, period.end]
  );

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Analytics" subtitle="Cross-module insights across clients, projects, timesheets and financials" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Monthly Recurring Revenue" value={formatCurrency(mrr)} icon={<DollarSign size={20} />} variant="success" trend={{ direction: "up", value: "this month" }} />
        <StatCard label="Total Billable Hours" value={`${billableHours} h`} icon={<Clock size={20} />} />
        <StatCard label="Revenue / Employee" value={formatCurrency(revenuePerEmployee)} icon={<Users size={20} />} variant="info" supporting={`${billableCount} billable`} />
        <StatCard label="Client Retention" value={`${retention}%`} icon={<Percent size={20} />} variant={retention >= 70 ? "success" : "warning"} supporting={`${activeClients} active`} />
        <StatCard label="Project Success Rate" value={`${successRate}%`} icon={<Target size={20} />} variant={successRate >= 60 ? "success" : "warning"} />
        <StatCard label="Avg Payment Cycle" value={`${avgCycle} days`} icon={<CalendarClock size={20} />} supporting="terms-based" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-gray-900"><TrendingUp size={16} className="mr-1 inline" />Revenue Trend</h2>
          <p className="mb-3 text-xs text-gray-500">Revenue by billing period</p>
          <div className="h-72"><RevenueTrendChart data={revenueTrend} /></div>
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-gray-900"><LayoutGrid size={16} className="mr-1 inline" />Project Distribution</h2>
          <p className="mb-3 text-xs text-gray-500">By project health</p>
          <div className="h-72"><ProjectHealthChart data={health} /></div>
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-gray-900"><ClipboardCheck size={16} className="mr-1 inline" />Timesheet Submission Rate</h2>
          <p className="mb-3 text-xs text-gray-500">Submitted vs pending by period</p>
          <div className="h-72"><TimesheetSubmissionChart data={submission} /></div>
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-gray-900"><Building2 size={16} className="mr-1 inline" />Top Clients by Revenue</h2>
          <p className="mb-3 text-xs text-gray-500">Ranked by billed total</p>
          <div className="h-72">
            {topClients.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No revenue data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClients} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                  <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={140} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [formatCurrency(Number(value)), "Revenue"]} />
                  <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]} barSize={14}>
                    {topClients.map((_, i) => <Cell key={i} fill={CHART_COLORS.palette[i % CHART_COLORS.palette.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card xl:col-span-2">
          <h2 className="mb-1 text-sm font-semibold text-gray-900"><Layers size={16} className="mr-1 inline" />Resource Utilization</h2>
          <p className="mb-3 text-xs text-gray-500">Allocation across the current period</p>
          <div className="h-72"><ResourceUtilizationChart data={utilization} /></div>
        </section>
      </div>
    </div>
  );
}
