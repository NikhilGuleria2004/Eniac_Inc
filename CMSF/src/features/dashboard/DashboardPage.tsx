import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Calendar, Clock, Receipt, FileText, FolderKanban, Send, AlertCircle, Briefcase } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatusBadge } from "../../components/data/StatusBadge";
import { DataTable } from "../../components/tables/DataTable";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import {
  getClients,
  getProjects,
  getEmployees,
  getTimesheets,
  getInvoices,
  getDailyLogs,
  getDailyLogsInPeriod,
  getActiveAssignmentsByEmployee,
} from "../../data/mock/repositories";
import { ClientIndustryChart } from "../../components/charts/ClientIndustryChart";
import { ProjectHealthChart } from "../../components/charts/ProjectHealthChart";
import { RevenueTrendChart } from "../../components/charts/RevenueTrendChart";
import { formatCurrency, formatNumber } from "../../lib/charts";
import { getPreviousBillingPeriods } from "../../lib/utils";
import {
  industryDistribution,
  projectHealthData,
  unbilledHours,
  outstandingInvoices,
  currentPeriod,
  hoursInPeriod,
  billableHoursInPeriod,
  workingDaysInPeriod,
} from "../dashboard/dashboardStats";
import { DailyLogFormModal } from "../dailylogs/DailyLogFormModal";
import { DailyLogQuickForm } from "../dailylogs/DailyLogQuickForm";
import { ROUTES } from "../../data/constants";
import type { Role, DailyLog, Timesheet, Invoice } from "../../types";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function recentDateLabel(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DashboardPage() {
  const { user, cmsAccess } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [logModalOpen, setLogModalOpen] = useState(false);

  const clients = useMemo(() => getClients(), []);
  const projects = useMemo(() => getProjects(), []);
  const employees = useMemo(() => getEmployees(), []);
  const timesheets = useMemo(() => getTimesheets(), []);
  const invoices = useMemo(() => getInvoices(), []);
  const dailyLogs = useMemo(() => getDailyLogs(), []);
  const period = currentPeriod();

  const role = user?.role ?? "EMPLOYEE";

const employeeId = user?.employeeId;

  const canCreateInvoice = !!user && (role === "ADMIN" || role === "MANAGER");
  const canViewAll = role === "ADMIN" || role === "MANAGER" || role === "SUPERVISOR";

  const myDailyLogs = useMemo(() => {
    if (role === "EMPLOYEE" && employeeId) {
      return dailyLogs.filter((d) => d.employeeId === employeeId).slice(0, 8);
    }
    return dailyLogs.slice(0, 8);
  }, [dailyLogs, role, employeeId]);

  const myTimesheets = useMemo(() => {
    if (role === "EMPLOYEE" && employeeId) {
      return timesheets.filter((t) => t.employeeId === employeeId);
    }
    return timesheets;
  }, [timesheets, role, employeeId]);

  const myCurrentTs = useMemo(() => {
    return myTimesheets.find((t) => t.employeeId === employeeId && t.periodStart === period.start);
  }, [myTimesheets, employeeId, period.start]);

  const myAssignments = useMemo(() => {
    if (role === "EMPLOYEE" && employeeId) {
      return getActiveAssignmentsByEmployee(employeeId);
    }
    return [];
  }, [employeeId, role]);

  const periodLogs = useMemo(() => {
    if (role === "EMPLOYEE" && employeeId) {
      return getDailyLogsInPeriod(employeeId, period.start, period.end);
    }
    return [];
  }, [employeeId, role, period.start, period.end]);

  const periodBillableLogs = useMemo(() => {
    if (role === "EMPLOYEE" && employeeId) {
      return periodLogs.filter((d) => d.billable);
    }
    return [];
  }, [periodLogs, employeeId, role]);

  const periodHoursLogged = useMemo(
    () => (role === "EMPLOYEE" && employeeId ? hoursInPeriod(dailyLogs, employeeId, period) : 0),
    [dailyLogs, employeeId, role, period],
  );

  const periodBillableHours = useMemo(
    () => (role === "EMPLOYEE" && employeeId ? billableHoursInPeriod(dailyLogs, employeeId, period) : 0),
    [dailyLogs, employeeId, role, period],
  );

  const expectedHours = useMemo(() => workingDaysInPeriod(period) * 8, [period]);

  const timesheetProgress = useMemo(() => {
    if (expectedHours > 0) return Math.min((periodHoursLogged / expectedHours) * 100, 100);
    return 0;
  }, [periodHoursLogged, expectedHours]);

  const pendingReview = useMemo(() => {
    return timesheets.filter((t) => t.status === "SUBMITTED" || t.status === "IN_REVIEW").slice(0, 6);
  }, [timesheets]);

  const pendingInvoices = useMemo(() => {
    if (role === "EMPLOYEE") return [];
    return invoices.filter((i) => i.status === "DRAFT" || i.status === "OVERDUE" || i.status === "PARTIAL").slice(0, 6);
  }, [invoices, role]);

  const recentActivity = useMemo(() => {
    const items: { id: string; label: string; date: string; icon: typeof Clock; color: string }[] = [];

    for (const log of myDailyLogs.slice(0, 3)) {
      items.push({
        id: `log-${log.id}`,
        label: `Daily log: ${log.projectName} (${log.totalHours} h)`,
        date: log.updatedAt,
        icon: Calendar,
        color: "text-blue-500",
      });
    }
    for (const ts of myTimesheets.slice(0, 2)) {
      items.push({
        id: `ts-${ts.id}`,
        label: `Timesheet ${ts.periodLabel} — ${ts.status}`,
        date: ts.updatedAt,
        icon: Clock,
        color: "text-green-500",
      });
    }
    if (role !== "EMPLOYEE") {
      for (const inv of pendingInvoices.slice(0, 2)) {
        items.push({
          id: `inv-${inv.id}`,
          label: `Invoice ${inv.invoiceNumber} — ${inv.status}`,
          date: inv.updatedAt,
          icon: Receipt,
          color: "text-purple-500",
        });
      }
    }

    return items
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }, [myDailyLogs, myTimesheets, pendingInvoices]);

  const handleRowClick = (entity: "daily-log" | "timesheet" | "invoice", id: string) => {
    if (entity === "daily-log") navigate(`/daily-logs/${id}`);
    if (entity === "timesheet") navigate(`/timesheets/my`);
    if (entity === "invoice") navigate(`/invoices/${id}`);
  };

  if (!user || !cmsAccess.granted) {
    return (
      <div className="page-container">
        <PageHeader title="Dashboard" />
        <p className="text-sm text-gray-500">
          {cmsAccess.reason === "HR_ROLE"
            ? "HR role does not have CMS access."
            : "Please log in to view the dashboard."}
        </p>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={role === "EMPLOYEE" ? "Your work overview" : "Team and project overview"}
        actions={
          <div className="flex items-center gap-2">
            {role === "EMPLOYEE" && (
              <button onClick={() => navigate("/daily-logs/new")} className="btn btn-primary">
                <Plus size={16} className="mr-2" />
                New Log
              </button>
            )}
            {canCreateInvoice && (
              <button onClick={() => navigate(ROUTES.INVOICE_NEW)} className="btn btn-secondary">
                <Receipt size={16} className="mr-2" />
                New Invoice
              </button>
            )}
          </div>
        }
      />

      {role === "ADMIN" && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Active Clients"
            value={clients.filter((c) => c.status === "ACTIVE").length}
            icon={<FileText size={20} />}
            variant="info"
            supporting={`${clients.length} total`}
          />
          <StatCard
            label="Active Projects"
            value={projects.filter((p) => p.status === "ACTIVE").length}
            icon={<FolderKanban size={20} />}
            variant="info"
            supporting={`${projects.length} total`}
          />
          <StatCard
            label="Billable Employees"
            value={employees.filter((e) => e.billingStatus === "BILLABLE" && e.employmentStatus === "ACTIVE").length}
            icon={<FileText size={20} />}
            variant="success"
          />
          <StatCard
            label="Unbilled Hours"
            value={`${formatNumber(Math.round(unbilledHours(timesheets, invoices)))} h`}
            icon={<Clock size={20} />}
            variant="warning"
            supporting="approved, not invoiced"
          />
          <StatCard
            label="Outstanding"
            value={outstandingInvoices(invoices).count}
            icon={<Receipt size={20} />}
            variant="danger"
            supporting={formatCurrency(outstandingInvoices(invoices).amount)}
          />
          <StatCard
            label="Pending Review"
            value={pendingReview.length}
            icon={<AlertCircle size={20} />}
            variant="warning"
          />
        </div>
      )}

      {role === "MANAGER" && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Team Timesheets" value={myTimesheets.length} icon={<Clock size={20} />} variant="info" />
          <StatCard
            label="Pending Approval"
            value={timesheets.filter((t) => t.status === "SUBMITTED" || t.status === "IN_REVIEW").length}
            icon={<AlertCircle size={20} />}
            variant="warning"
          />
          <StatCard label="Draft Invoices" value={invoices.filter((i) => i.status === "DRAFT").length} icon={<Receipt size={20} />} variant="info" />
          <StatCard label="Overdue Invoices" value={invoices.filter((i) => i.status === "OVERDUE").length} icon={<AlertCircle size={20} />} variant="danger" />
        </div>
      )}

      {role === "EMPLOYEE" && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Hours This Period"
            value={`${Math.round(periodHoursLogged)} h`}
            icon={<Clock size={20} />}
            variant="info"
            supporting={`${periodBillableHours} billable`}
          />
          <StatCard
            label="Billable Hours"
            value={`${Math.round(periodBillableHours)} h`}
            icon={<Receipt size={20} />}
            variant="success"
          />
          <StatCard
            label="Logs Submitted"
            value={periodLogs.length}
            icon={<Calendar size={20} />}
            variant="default"
            supporting={`${periodBillableLogs.length} billable`}
          />
          <StatCard
            label="Timesheet Status"
            value={myCurrentTs ? myCurrentTs.status.replace("_", " ") : "Not started"}
            icon={<FileText size={20} />}
            variant={myCurrentTs?.status === "APPROVED" || myCurrentTs?.status === "PAID" ? "success" : "warning"}
          />
        </div>
      )}

      {role === "EMPLOYEE" && (
        <SectionCard
          title="Timesheet Progress"
          subtitle={period.label}
          action={
            <button onClick={() => navigate("/timesheets/my")} className="text-xs text-accent hover:underline">
              View timesheet
            </button>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {Math.round(periodHoursLogged)}h logged of {expectedHours}h expected
              </span>
              <span className="font-medium text-gray-900">{Math.round(timesheetProgress)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${timesheetProgress}%` }}
              />
            </div>
            {timesheetProgress < 100 && timesheetProgress > 0 && (
              <p className="text-xs text-gray-500">
                {Math.round(((expectedHours - periodHoursLogged) / 8) * 10) / 10} work days remaining
              </p>
            )}
            {timesheetProgress === 0 && (
              <p className="text-xs text-gray-500">No hours logged yet this period. Use the quick form below to get started.</p>
            )}
          </div>
        </SectionCard>
      )}

      {role === "EMPLOYEE" && (
        <SectionCard title="Log Hours" subtitle="Quick entry for today">
          <DailyLogQuickForm />
        </SectionCard>
      )}

      {role === "EMPLOYEE" && myCurrentTs && (
        <SectionCard title="My Current Timesheet" subtitle={period.label}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Status</span>
              <StatusBadge status={myCurrentTs.status} kind="timesheet" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Billable Hours</span>
              <span className="font-medium text-gray-900">{myCurrentTs.totalBillableHours} h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Hours</span>
              <span className="font-medium text-gray-900">{myCurrentTs.totalHours} h</span>
            </div>
          </div>
        </SectionCard>
      )}

      {role === "EMPLOYEE" && myAssignments.length > 0 && (
        <SectionCard
          title="My Projects"
          action={
            <button onClick={() => navigate("/projects")} className="text-xs text-accent hover:underline">
              View all
            </button>
          }
        >
          <div className="space-y-3">
            {myAssignments.slice(0, 6).map((a) => {
              const proj = projects.find((p) => p.id === a.projectId);
              return (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Briefcase size={16} className="text-accent" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{proj?.name ?? "—"}</p>
                      <p className="text-xs text-gray-500">{proj?.clientName}</p>
                    </div>
                  </div>
                  <StatusBadge status={proj?.status ?? "ACTIVE"} kind="project" />
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(role === "ADMIN" || role === "MANAGER") && (
          <>
            <SectionCard title="Pending Actions">
              <div className="space-y-3">
                {pendingReview.length === 0 && pendingInvoices.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending actions.</p>
                ) : (
                  <>
                    {pendingReview.slice(0, 3).map((ts) => (
                      <div
                        key={ts.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate("/timesheets")}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ts.employeeName}</p>
                          <p className="text-xs text-gray-500">{ts.periodLabel}</p>
                        </div>
                        <StatusBadge status={ts.status} kind="timesheet" />
                      </div>
                    ))}
                    {pendingInvoices.slice(0, 3).map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                          <p className="text-xs text-gray-500">{inv.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">{formatCurrency(inv.balanceDue, inv.currency)}</p>
                          <StatusBadge status={inv.status} kind="invoice" />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </SectionCard>

            {(role === "ADMIN" || role === "SUPERVISOR") && (
              <SectionCard title="Recent Activity">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent activity.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {recentActivity.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-2">
                        <a.icon size={16} className={a.color} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{a.label}</p>
                        </div>
                        <span className="text-xs text-gray-500">{recentDateLabel(a.date)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            )}
          </>
        )}

        {role === "EMPLOYEE" && (
          <SectionCard title="Recent Activity">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2">
                    <a.icon size={16} className={a.color} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{a.label}</p>
                    </div>
                    <span className="text-xs text-gray-500">{recentDateLabel(a.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        <SectionCard
          title="Recent Daily Logs"
          action={
            <button
              onClick={() => setLogModalOpen(true)}
              className="text-xs text-accent hover:underline"
              disabled={role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERVISOR" && role !== "EMPLOYEE"}
            >
              + Log Hours
            </button>
          }
        >
          <DataTable
            data={myDailyLogs}
            keyExtractor={(d) => d.id}
            emptyState={{ title: "No logs yet", description: "Click + Log Hours to add your first entry." }}
            onRowClick={(d) => handleRowClick("daily-log", d.id)}
            columns={[
              { key: "workDate", header: "Date", cell: (d) => d.workDate },
              { key: "projectName", header: "Project", cell: (d) => d.projectName },
              {
                key: "totalHours",
                header: "Hours",
                cell: (d) => `${d.totalHours} h`,
              },
              {
                key: "billable",
                header: "Billable",
                cell: (d) => (d.billable ? "Yes" : "No"),
              },
              {
                key: "status",
                header: "Status",
                cell: (d) => <StatusBadge status={d.status} kind="status" label={d.status} />,
              },
            ]}
          />
        </SectionCard>

        <SectionCard
          title="My Timesheets"
          action={
            <button
              onClick={() => navigate("/timesheets/my")}
              className="text-xs text-accent hover:underline"
            >
              View all
            </button>
          }
        >
          <DataTable
            data={myTimesheets.slice(0, 8)}
            keyExtractor={(t) => t.id}
            emptyState={{ title: "No timesheets" }}
            onRowClick={(t) => handleRowClick("timesheet", t.id)}
            columns={[
              { key: "periodLabel", header: "Period", cell: (t) => t.periodLabel },
              { key: "totalHours", header: "Hours", cell: (t) => `${t.totalHours} h` },
              {
                key: "billableAmount",
                header: "Billable",
                cell: (t) => (
                  <span className="text-xs">{formatCurrency(t.billableAmount)}</span>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (t) => <StatusBadge status={t.status} kind="timesheet" />,
              },
            ]}
          />
        </SectionCard>
      </div>

      {role === "ADMIN" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard title="Recent Invoices">
            <DataTable
              data={invoices.slice(0, 6)}
              keyExtractor={(i) => i.id}
              emptyState={{ title: "No invoices" }}
              onRowClick={(i) => handleRowClick("invoice", i.id)}
              columns={[
                { key: "invoiceNumber", header: "No.", cell: (i) => i.invoiceNumber },
                { key: "clientName", header: "Client", cell: (i) => i.clientName },
                {
                  key: "totalAmount",
                  header: "Amount",
                  cell: (i) => (
                    <span className="text-xs">{formatCurrency(i.totalAmount, i.currency)}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (i) => <StatusBadge status={i.status} kind="invoice" />,
                },
              ]}
            />
          </SectionCard>

          <SectionCard title="Revenue by Period" contentClassName="h-60">
            <RevenueTrendChart
              data={getPreviousBillingPeriods(6)
                .reverse()
                .map((p) => ({
                  label: p.label,
                  revenue:
                    invoices
                      .filter((i) => (i.periodLabel ?? "") === p.label && i.status !== "DRAFT" && i.status !== "VOID" && i.status !== "CANCELLED")
                      .reduce((s, i) => s + i.totalAmount, 0) ?? 0,
                }))}
            />
          </SectionCard>

          <SectionCard title="Project Health" contentClassName="h-60">
            <ProjectHealthChart data={projectHealthData(projects)} />
          </SectionCard>
        </div>
      )}

      <DailyLogFormModal open={logModalOpen} onClose={() => setLogModalOpen(false)} />
    </div>
  );
}
