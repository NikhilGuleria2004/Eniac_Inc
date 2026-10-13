import { useState, useMemo } from "react";
import { Shield, Search, BarChart3, Users, Clock, Eye, AlertTriangle } from "lucide-react";
import { DataTable } from "../../components/tables/DataTable";
import { FilterBar } from "../../components/ui/FilterBar";
import { Modal } from "../../components/ui/Modal";
import { getAuditLogs, getEmployees } from "../../data/mock/repositories";
import { computeAuditKPIs, filterAuditLogs, getUniqueAuditUsers, getUniqueAuditRoles, getUniqueAuditActions, getUniqueAuditEntities, getActionColor, getEntityLabel, formatTimestamp, getDateOptions } from "./audit";
import type { AuditLog } from "../../types";

export function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [detailOpen, setDetailOpen] = useState<{ open: boolean; log: AuditLog | null }>({ open: false, log: null });

  const allLogs = useMemo(() => getAuditLogs(), []);
  const employees = useMemo(() => getEmployees(), []);

  const kpis = useMemo(() => computeAuditKPIs(allLogs), [allLogs]);

  const filteredLogs = useMemo(
    () => filterAuditLogs(allLogs, { search, user: userFilter, role: roleFilter, action: actionFilter, entity: entityFilter, date: dateFilter }),
    [allLogs, search, userFilter, roleFilter, actionFilter, entityFilter, dateFilter]
  );

  const sortedLogs = useMemo(() => [...filteredLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [filteredLogs]);

  const uniqueUsers = useMemo(() => getUniqueAuditUsers(allLogs), [allLogs]);
  const uniqueRoles = useMemo(() => getUniqueAuditRoles(allLogs), [allLogs]);
  const actions = useMemo(() => getUniqueAuditActions(), []);
  const entities = useMemo(() => getUniqueAuditEntities(), []);
  const dates = useMemo(() => getDateOptions(allLogs), [allLogs]);

  const userOptions = [{ label: "All Users", value: "all" }, ...uniqueUsers.map((u) => ({ label: u.name, value: u.id }))];
  const roleOptions = [{ label: "All Roles", value: "all" }, ...uniqueRoles.map((r) => ({ label: r, value: r }))];
  const actionOptions = [{ label: "All Actions", value: "all" }, ...actions.map((a) => ({ label: a, value: a }))];
  const entityOptions = [{ label: "All Entities", value: "all" }, ...entities.map((e) => ({ label: getEntityLabel(e), value: e }))];
  const dateOptions = dates;

  const hasActiveFilters =
    userFilter !== "all" || roleFilter !== "all" || actionFilter !== "all" || entityFilter !== "all" || dateFilter !== "all" || search !== "";

  const handleClearAll = () => {
    setSearch("");
    setUserFilter("all");
    setRoleFilter("all");
    setActionFilter("all");
    setEntityFilter("all");
    setDateFilter("all");
  };

  const handleViewDetail = (log: AuditLog) => {
    setDetailOpen({ open: true, log });
  };

  const handleCloseDetail = () => {
    setDetailOpen({ open: false, log: null });
  };

  const columns = [
    {
      key: "timestamp",
      header: "Timestamp",
      sortable: true,
      cell: (row: AuditLog) => <span className="text-xs text-gray-600">{formatTimestamp(row.timestamp)}</span>,
    },
    {
      key: "userName",
      header: "User",
      cell: (row: AuditLog) => {
        const emp = employees.find((e) => e.id === row.userId);
        return (
          <div className="flex items-center gap-2">
            {emp?.avatar && <img src={emp.avatar} alt={row.userName} className="w-6 h-6 rounded-full" />}
            <span className="text-sm text-gray-900">{row.userName}</span>
          </div>
        );
      },
    },
    {
      key: "role",
      header: "Role",
      cell: (row: AuditLog) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{row.role}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (row: AuditLog) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(row.action)}`}>{row.action}</span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      cell: (row: AuditLog) => <span className="text-sm text-gray-900">{getEntityLabel(row.entity)}</span>,
    },
    {
      key: "entityId",
      header: "Entity ID",
      cell: (row: AuditLog) => <span className="text-sm text-gray-600 font-mono">{row.entityId}</span>,
    },
    {
      key: "description",
      header: "Description",
      cell: (row: AuditLog) => <span className="text-sm text-gray-700">{row.description}</span>,
    },
    {
      key: "ipAddress",
      header: "IP",
      cell: (row: AuditLog) => <span className="text-xs text-gray-500 font-mono">{row.ipAddress}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: AuditLog) => (
        <button
          onClick={() => handleViewDetail(row)}
          className="text-accent hover:text-accent-hover text-xs font-medium"
          title="View details"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  return (
     <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">Track all system actions and changes</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Admin only</span>
          <Shield size={18} className="text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIStat label="Total Logs" value={kpis.totalLogs} icon={<BarChart3 size={20} />} />
        <KPIStat label="Critical Actions" value={kpis.criticalActions} icon={<AlertTriangle size={20} />} variant="warning" />
        <KPIStat label="Active Users" value={kpis.uniqueUsers} icon={<Users size={20} />} variant="info" />
        <KPIStat label="Today" value={kpis.todayCount} icon={<Clock size={20} />} variant="success" />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200">
          <div className="flex-1 max-w-xs">
            <label className="sr-only">Search audit logs</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by description, user, or entity ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <FilterBar
            filters={[
              { key: "user", label: "User", value: userFilter, options: userOptions, onChange: setUserFilter },
              { key: "role", label: "Role", value: roleFilter, options: roleOptions, onChange: setRoleFilter },
              { key: "action", label: "Action", value: actionFilter, options: actionOptions, onChange: setActionFilter },
              { key: "entity", label: "Entity", value: entityFilter, options: entityOptions, onChange: setEntityFilter },
              { key: "date", label: "Date", value: dateFilter, options: dateOptions, onChange: setDateFilter },
            ]}
            onClearAll={handleClearAll}
          />
        </div>
        <DataTable
          data={sortedLogs}
          columns={columns}
          keyExtractor={(row) => row.id}
          emptyState={{
            title: "No audit logs found",
            description: hasActiveFilters ? "Try adjusting your filters or search terms." : "No audit log entries available.",
          }}
        />
      </div>

      <AuditDetailModal
        open={detailOpen.open}
        onClose={handleCloseDetail}
        log={detailOpen.log}
      />
    </div>
  );
}

function KPIStat({ label, value, icon, variant = "default" }: { label: string; value: number; icon: React.ReactNode; variant?: "default" | "success" | "warning" | "info" }) {
  const bgColors = { default: "bg-gray-50", success: "bg-green-50", warning: "bg-yellow-50", info: "bg-blue-50" };
  const textColors = { default: "text-gray-900", success: "text-green-700", warning: "text-yellow-700", info: "text-blue-700" };
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

interface AuditDetailModalProps {
  open: boolean;
  onClose: () => void;
  log: AuditLog | null;
}

function AuditDetailModal({ open, onClose, log }: AuditDetailModalProps) {
  if (!open || !log) return null;

  return (
    <Modal open={open} onClose={onClose} title="Audit Log Entry" size="md">
      <div className="space-y-4">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-xs text-gray-500 uppercase">Timestamp</dt>
            <dd className="font-medium text-gray-900">{formatTimestamp(log.timestamp)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs text-gray-500 uppercase">User</dt>
            <dd className="font-medium text-gray-900">{log.userName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs text-gray-500 uppercase">Role</dt>
            <dd>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{log.role}</span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs text-gray-500 uppercase">Action</dt>
            <dd>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>{log.action}</span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs text-gray-500 uppercase">Entity</dt>
            <dd>
              <span className="font-medium text-gray-900">{getEntityLabel(log.entity)}</span>
              <span className="text-xs text-gray-500 ml-2">ID: {log.entityId}</span>
            </dd>
          </div>
          <div className="pt-2">
            <dt className="text-xs text-gray-500 uppercase">Description</dt>
            <dd className="font-medium text-gray-900 mt-1">{log.description}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs text-gray-500 uppercase">IP Address</dt>
            <dd className="font-mono text-gray-900">{log.ipAddress}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-xs text-gray-500 uppercase">User ID</dt>
            <dd className="font-mono text-gray-500">{log.userId}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
