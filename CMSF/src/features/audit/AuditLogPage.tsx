import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Select } from "../../components/ui/Select";
import { DataTable } from "../../components/tables/DataTable";
import { getAuditLogs } from "../../data/mock/repositories";
import type { AuditLog } from "../../types";

const ENTITIES = ["CLIENT", "PROJECT", "ASSIGNMENT", "TIMESHEET", "INVOICE", "DAILY_LOG", "USER"] as const;

export function AuditLogPage() {
  const logs = useMemo(() => getAuditLogs(), []);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (entity !== "all" && l.entity !== entity) return false;
      if (action !== "all" && l.action !== action) return false;
      if (q && !`${l.userName} ${l.action} ${l.entity} ${l.description}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, search, entity, action]);

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Audit Log" subtitle="Read-only trail of CMS activity" />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user, action, description..." className="form-input pl-10" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:grid-cols-2">
            <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="all">All Entities</option>
              {ENTITIES.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
            </Select>
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="all">All Actions</option>
              {uniqueActions.map((a) => <option key={a} value={a}>{a.replace(/[._]/g, " ")}</option>)}
            </Select>
          </div>
        </div>

        <DataTable
          data={filtered}
          keyExtractor={(l) => l.id}
          emptyState={{ title: "No audit entries", description: "Activity will appear here as it happens." }}
          columns={[
            { key: "timestamp", header: "Timestamp", cell: (l: AuditLog) => new Date(l.timestamp).toLocaleString() },
            { key: "userName", header: "User", cell: (l: AuditLog) => (
              <div><p className="text-gray-900">{l.userName}</p><p className="text-xs text-gray-500">{l.role}</p></div>
            ) },
            { key: "action", header: "Action", cell: (l: AuditLog) => <span className="text-sm text-gray-700">{l.action.replace(/_/g, " ")}</span> },
            { key: "entity", header: "Entity", cell: (l: AuditLog) => l.entity.replace("_", " ") },
            { key: "description", header: "Description", cell: (l: AuditLog) => <span className="text-gray-600">{l.description}</span> },
          ]}
        />
      </div>
    </div>
  );
}
