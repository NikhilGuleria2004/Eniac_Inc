import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ClipboardList, Clock, CalendarClock, AlertTriangle, Plus, Search, Pencil } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { useAuth } from "../../features/auth/AuthContext";
import {
  getDailyLogs,
  getEmployees,
  getProjects,
  getClients,
  getTimesheets,
  updateDailyLog,
} from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { getCurrentBillingPeriod } from "../../lib/utils";
import { DailyLogFormModal } from "./DailyLogFormModal";
import type { DailyLog } from "../../types";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function DailyLogsDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [employee, setEmployee] = useState("all");
  const [project, setProject] = useState("all");
  const [client, setClient] = useState("all");
  const [status, setStatus] = useState("all");
  const [billable, setBillable] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DailyLog | null>(null);

  const employees = useMemo(() => getEmployees(), []);
  const projects = useMemo(() => getProjects(), []);
  const clients = useMemo(() => getClients(), []);
  const timesheets = useMemo(() => getTimesheets(), []);
  const period = getCurrentBillingPeriod();

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, `${e.firstName} ${e.lastName}`])), [employees]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, { name: p.name, clientId: p.clientId, clientName: p.clientName }])), [projects]);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const lockedIds = useMemo(() => {
    const s = new Set<string>();
    for (const t of timesheets) {
      if (t.status === "APPROVED" || t.status === "PAID") for (const id of t.dailyLogIds) s.add(id);
    }
    return s;
  }, [timesheets]);

  const scopeProjectIds = useMemo(() => {
    if (!user) return null;
    if (user.role === "ADMIN" || user.role === "EMPLOYEE") return null;
    const ids = projects.filter((p) => p.managerId === user.employeeId || p.supervisorId === user.employeeId).map((p) => p.id);
    return new Set(ids);
  }, [projects, user]);

  const baseLogs = useMemo(() => {
    const all = getDailyLogs();
    return all.filter((d) => {
      if (user?.role === "EMPLOYEE") return d.employeeId === user.employeeId;
      if (scopeProjectIds) return scopeProjectIds.has(d.projectId);
      return true;
    });
  }, [scopeProjectIds, user?.role, user?.employeeId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return baseLogs.filter((d) => {
      const proj = projectMap.get(d.projectId);
      if (employee !== "all" && d.employeeId !== employee) return false;
      if (project !== "all" && d.projectId !== project) return false;
      if (client !== "all" && proj?.clientId !== client) return false;
      if (status !== "all" && d.status !== status) return false;
      if (billable !== "all" && String(d.billable) !== billable) return false;
      if (dateFrom && d.workDate < dateFrom) return false;
      if (dateTo && d.workDate > dateTo) return false;
      if (q && !`${d.employeeName} ${d.projectName} ${d.description} ${d.workDate}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [baseLogs, search, employee, project, client, status, billable, dateFrom, dateTo, projectMap]);

  const today = isoToday();
  const monday = startOfWeek(today);
  const todayLogs = baseLogs.filter((d) => d.workDate === today);
  const pendingReview = baseLogs.filter((d) => d.status === "SUBMITTED" && !lockedIds.has(d.id)).length;
  const wtdHours = baseLogs.filter((d) => d.workDate >= monday && d.workDate <= today).reduce((s, d) => s + d.totalHours, 0);
  const overtimeToday = todayLogs.reduce((s, d) => s + d.overtimeHours, 0);
  const distinctLoggedDays = new Set(baseLogs.filter((d) => d.workDate >= period.start && d.workDate <= today).map((d) => d.workDate)).size;
  const workingDays = countWorkingDays(period.start, today);
  const missingLogs = Math.max(0, workingDays - distinctLoggedDays);

  const hasFilters = employee !== "all" || project !== "all" || client !== "all" || status !== "all" || billable !== "all" || dateFrom || dateTo || search !== "";

  const employeeOptions = [{ label: "All Employees", value: "all" }, ...Array.from(new Set(baseLogs.map((d) => d.employeeId))).map((id) => ({ label: employeeMap.get(id) ?? id, value: id }))];
  const projectOptions = [{ label: "All Projects", value: "all" }, ...Array.from(new Set(baseLogs.map((d) => d.projectId))).map((id) => ({ label: projectMap.get(id)?.name ?? id, value: id }))];
  const clientOptions = [{ label: "All Clients", value: "all" }, ...Array.from(new Set(baseLogs.map((d) => projectMap.get(d.projectId)?.clientId).filter((x): x is string => Boolean(x)))).map((id) => ({ label: clientMap.get(id) ?? id, value: id }))];
  const statusOptions = [{ label: "All Statuses", value: "all" }, { label: "Draft", value: "DRAFT" }, { label: "Submitted", value: "SUBMITTED" }, { label: "Locked", value: "LOCKED" }];
  const billableOptions = [{ label: "Any", value: "all" }, { label: "Billable", value: "true" }, { label: "Non-billable", value: "false" }];

  const handleInlineHours = (d: DailyLog, patch: Partial<DailyLog>) => {
    if (lockedIds.has(d.id)) return;
    const next: Partial<DailyLog> = { ...patch };
    const reg = patch.regularHours ?? d.regularHours;
    const ot = patch.overtimeHours ?? d.overtimeHours;
    if (reg + ot > 24) return;
    if (!isWeekendRow(d) && patch.overtimeHours && patch.overtimeHours > 0) return;
    updateDailyLog(d.id, next);
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Daily Work Logs"
        subtitle={user?.role === "EMPLOYEE" ? "Your daily time entries" : "Team daily time entries"}
        actions={
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={16} className="mr-2" />
            New Log Entry
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Today's Logs" value={todayLogs.length} icon={<CalendarCheck size={20} />} variant="info" />
        <StatCard label="Pending Review" value={pendingReview} icon={<ClipboardList size={20} />} variant="warning" />
        <StatCard label="Week-to-Date Hours" value={`${wtdHours} h`} icon={<Clock size={20} />} />
        <StatCard label="Overtime Today" value={`${overtimeToday} h`} icon={<CalendarClock size={20} />} variant="warning" />
        <StatCard label="Missing Logs" value={missingLogs} icon={<AlertTriangle size={20} />} variant={missingLogs > 0 ? "danger" : "default"} supporting={`${period.label}`} />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by employee, project, date, description..." className="form-input pl-10" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Select value={employee} onChange={(e) => setEmployee(e.target.value)}>{employeeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={project} onChange={(e) => setProject(e.target.value)}>{projectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={client} onChange={(e) => setClient(e.target.value)}>{clientOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>{statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={billable} onChange={(e) => setBillable(e.target.value)}>{billableOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <div className="flex items-center gap-1">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
            </div>
          </div>
          {hasFilters && (
            <button className="self-start text-sm text-accent hover:underline" onClick={() => { setSearch(""); setEmployee("all"); setProject("all"); setClient("all"); setStatus("all"); setBillable("all"); setDateFrom(""); setDateTo(""); }}>Clear all filters</button>
          )}
        </div>

        <DataTable
          data={filtered}
          keyExtractor={(d) => d.id}
          onRowClick={(d) => navigate(ROUTES.DAILY_LOG_DETAIL.replace(":logId", d.id))}
          emptyState={{ title: "No daily logs found", description: hasFilters ? "Try adjusting your filters or search." : "Log your first hours to get started." }}
          columns={[
            { key: "employeeName", header: "Employee", cell: (d) => <span className="font-medium text-gray-900">{d.employeeName}</span> },
            { key: "workDate", header: "Date", cell: (d) => d.workDate },
            { key: "dayOfWeek", header: "Day", cell: (d) => d.dayOfWeek },
            { key: "projectName", header: "Project", cell: (d) => d.projectName },
            { key: "description", header: "Work Description", cell: (d) => <span className="line-clamp-1 max-w-xs text-gray-600">{d.description}</span> },
            { key: "hours", header: "Hours", cell: (d) => {
              const weekend = d.dayOfWeek === "Sat" || d.dayOfWeek === "Sun";
              return (
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-gray-500">Reg</span>
                    <input
                      type="number" step={0.25} min={0} max={24} value={d.regularHours}
                      disabled={lockedIds.has(d.id)}
                      onChange={(e) => handleInlineHours(d, { regularHours: Number(e.target.value) })}
                      onClick={(e) => e.stopPropagation()}
                      className="w-14 rounded border border-gray-300 px-1 py-0.5 text-sm disabled:bg-gray-100"
                    />
                  </div>
                  {weekend && (
                    <div className="flex items-center gap-0.5">
                      <span className="text-xs text-gray-500">OT</span>
                      <input
                        type="number" step={0.25} min={0} max={24} value={d.overtimeHours}
                        disabled={lockedIds.has(d.id)}
                        onChange={(e) => handleInlineHours(d, { overtimeHours: Number(e.target.value) })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-14 rounded border border-gray-300 px-1 py-0.5 text-sm disabled:bg-gray-100"
                      />
                    </div>
                  )}
                </div>
              );
            } },
            { key: "totalHours", header: "Total Hours", cell: (d) => `${d.totalHours} h` },
            { key: "billable", header: "Billable", cell: (d) => (d.billable ? <StatusBadge status="ACTIVE" label="Yes" /> : <StatusBadge status="INACTIVE" label="No" />) },
            { key: "status", header: "Status", cell: (d) => (
              lockedIds.has(d.id) ? <StatusBadge status="CLOSED" label="Locked" /> : <StatusBadge status={d.status === "DRAFT" ? "SUSPENDED" : "ACTIVE"} label={d.status === "DRAFT" ? "Draft" : "Submitted"} />
            ) },
            {
              key: "actions",
              header: "Actions",
              cell: (d) => (
                <button
                  className="text-accent hover:underline text-sm"
                  onClick={(e) => { e.stopPropagation(); setFormOpen(true); setEditing(d); }}
                >
                  <Pencil size={14} className="inline" /> Edit
                </button>
              ),
            },
          ]}
        />
      </div>

      {editing && <DailyLogFormModal open initialData={editing} onClose={() => { setFormOpen(false); setEditing(null); }} />}
      {formOpen && !editing && <DailyLogFormModal open onClose={() => setFormOpen(false)} />}
    </div>
  );
}

function isWeekendRow(d: DailyLog): boolean {
  return d.dayOfWeek === "Sat" || d.dayOfWeek === "Sun";
}

function countWorkingDays(fromIso: string, toIso: string): number {
  if (!fromIso || !toIso) return 0;
  let count = 0;
  const d = new Date(`${fromIso}T00:00:00`);
  const end = new Date(`${toIso}T00:00:00`);
  while (d <= end) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}
