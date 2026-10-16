import { useMemo, useState } from "react";
import { Bell, BellRing, Check, CheckCheck, Inbox } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { DataTable } from "../../components/tables/DataTable";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../../data/mock/repositories";
import type { Notification } from "../../types";

const TABS = ["All", "Unread", "Approvals", "Timesheet", "Project", "System"] as const;
type Tab = (typeof TABS)[number];

function matchesTab(n: Notification, tab: Tab): boolean {
  switch (tab) {
    case "All": return true;
    case "Unread": return !n.read;
    case "Approvals": return n.type === "TIMESHEET_SUBMITTED" || n.type === "INVOICE_SENT";
    case "Timesheet": return n.type.startsWith("TIMESHEET") || n.type === "DAILY_LOG_REMINDER";
    case "Project": return n.type === "PROJECT_ASSIGNED" || n.type === "ASSIGNMENT_CREATED" || n.type === "CLIENT_CREATED";
    case "System": return n.type === "SYSTEM";
    default: return true;
  }
}

export function NotificationCenterPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const userId = user?.employeeId ?? "EMP-005";
  const [tab, setTab] = useState<Tab>("All");
  const [search, setSearch] = useState("");

  const notifications = useMemo(
    () => (user?.role === "EMPLOYEE" ? getNotifications().filter((n) => n.userId === userId) : getNotifications()),
    [user?.role, userId]
  );

  const kpis = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    read: notifications.filter((n) => n.read).length,
    system: notifications.filter((n) => n.type === "SYSTEM" || n.type === "DAILY_LOG_REMINDER").length,
    mentions: notifications.filter((n) => ["PROJECT_ASSIGNED", "ASSIGNMENT_CREATED", "CLIENT_CREATED"].includes(n.type)).length,
    approvals: notifications.filter((n) => n.type === "TIMESHEET_SUBMITTED" || n.type === "INVOICE_SENT").length,
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notifications.filter((n) => matchesTab(n, tab) && (!q || `${n.title} ${n.message} ${n.type}`.toLowerCase().includes(q)));
  }, [notifications, tab, search]);

  const handleMarkAll = () => {
    markAllNotificationsRead(userId);
    addToast("success", "All notifications marked read");
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Timesheet, invoice, project and system alerts"
        actions={
          <button className="btn btn-secondary" onClick={handleMarkAll}><CheckCheck size={16} className="mr-2" />Mark all read</button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total" value={kpis.total} icon={<Inbox size={20} />} />
        <StatCard label="Unread" value={kpis.unread} icon={<BellRing size={20} />} variant="warning" />
        <StatCard label="Read" value={kpis.read} icon={<Check size={20} />} variant="success" />
        <StatCard label="System" value={kpis.system} icon={<Bell size={20} />} />
        <StatCard label="Mentions" value={kpis.mentions} icon={<Bell size={20} />} variant="info" />
        <StatCard label="Approvals" value={kpis.approvals} icon={<Bell size={20} />} variant="warning" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-accent text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{t}</button>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notifications..."
          className="form-input ml-auto max-w-xs"
        />
      </div>

      <DataTable
        data={filtered}
        keyExtractor={(n) => n.id}
        emptyState={{ title: "No notifications", description: "You're all caught up." }}
        columns={[
          { key: "status", header: "Status", cell: (n) => (n.read ? <span className="badge badge-neutral">Read</span> : <span className="badge badge-info">Unread</span>) },
          { key: "type", header: "Type", cell: (n) => <span className="text-xs text-gray-600">{n.type.replace(/_/g, " ")}</span> },
          { key: "title", header: "Title", cell: (n) => <span className="font-medium text-gray-900">{n.title}</span> },
          { key: "message", header: "Message", cell: (n) => <span className="text-gray-600">{n.message}</span> },
          { key: "createdAt", header: "Timestamp", cell: (n) => new Date(n.createdAt).toLocaleString() },
          { key: "actions", header: "Actions", cell: (n) => (
            n.read ? <span className="text-gray-400 text-sm">—</span> : (
              <button className="text-accent hover:underline text-sm" onClick={() => { markNotificationRead(n.id); addToast("success", "Marked read"); }}>Mark read</button>
            )
          ) },
        ]}
      />
    </div>
  );
}
