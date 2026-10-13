import { useState, useMemo } from "react";
import { Bell, CheckCheck, Clock, Trash2, ExternalLink, Search } from "lucide-react";
import { DataTable } from "../../components/tables/DataTable";
import { FilterBar } from "../../components/ui/FilterBar";
import { Modal } from "../../components/ui/Modal";
import { getNotificationsByUser, getUnreadNotificationCount, markNotificationAsRead, markAllNotificationsAsRead } from "../../data/mock/repositories";
import { computeNotificationKPIs, filterNotifications, getNotificationTypeLabel, getNotificationTypeColor, FILTER_OPTIONS } from "./notifications";
import type { NotificationFilter } from "./notifications";
import { useAuth } from "../../features/auth/AuthContext";
import { useToast } from "../../components/ui/Toast";
import type { Notification } from "../../types";

export function NotificationCenterPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<Notification | null>(null);

  const userId = user?.id ?? "";
  const notifications = useMemo(() => getNotificationsByUser(userId), [userId]);
  const kpis = useMemo(() => computeNotificationKPIs(notifications), [notifications]);
  const unreadCount = useMemo(() => getUnreadNotificationCount(userId), [userId]);

  const filtered = useMemo(
    () => filterNotifications(notifications, { search, filter: activeFilter }),
    [notifications, search, activeFilter]
  );

  const handleMarkAllRead = () => {
    const count = markAllNotificationsAsRead(userId);
    addToast("success", `${count} notification${count !== 1 ? "s" : ""} marked as read`);
    window.location.reload();
  };

  const handleMarkAsRead = (notification: Notification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
      addToast("info", "Notification marked as read");
      window.location.reload();
    }
  };

  const handleDelete = (notification: Notification) => {
    setDeleteConfirm(notification);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      addToast("info", "Notification removed");
      setDeleteConfirm(null);
    }
  };

  const filterOptions = FILTER_OPTIONS.map((f) => ({ label: f.label, value: f.value }));

  const columns = [
    {
      key: "read",
      header: "Status",
      cell: (row: Notification) => (
        <div className="flex items-center justify-center">
          {!row.read && <div className="w-2 h-2 rounded-full bg-accent" />}
          {row.read && <CheckCheck size={16} className="text-gray-400" />}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row: Notification) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getNotificationTypeColor(row.type)}`}>
          {getNotificationTypeLabel(row.type)}
        </span>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (row: Notification) => <span className={`text-sm font-medium ${!row.read ? "text-gray-900" : "text-gray-600"}`}>{row.title}</span>,
    },
    {
      key: "message",
      header: "Description",
      cell: (row: Notification) => <span className="text-sm text-gray-600 max-w-md truncate">{row.message}</span>,
    },
    {
      key: "createdAt",
      header: "Timestamp",
      cell: (row: Notification) => (
        <span className="text-xs text-gray-500">
          {new Date(row.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: Notification) => (
        <div className="flex items-center gap-2">
          {!row.read && (
            <button
              onClick={(e) => { e.stopPropagation(); handleMarkAsRead(row); }}
              className="text-xs text-accent hover:underline"
              title="Mark as read"
            >
              Mark Read
            </button>
          )}
          {row.actionUrl && (
            <a
              href={row.actionUrl}
              className="text-gray-500 hover:text-gray-700"
              title="View"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
            className="text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
     <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notification Center</h1>
          <p className="text-sm text-gray-500 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="btn btn-secondary"
        >
          <CheckCheck size={16} className="mr-2" />
          Mark All as Read
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total" value={kpis.total} icon={<Bell size={20} />} />
        <KPICard label="Unread" value={kpis.unread} icon={<Bell size={20} className="text-blue-600" />} variant="info" />
        <KPICard label="Read" value={kpis.read} icon={<CheckCheck size={20} className="text-green-600" />} variant="success" />
        <KPICard label="System" value={kpis.system} icon={<Clock size={20} className="text-gray-500" />} variant="neutral" />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200">
          <div className="flex-1 max-w-xs">
            <label className="sr-only">Search notifications</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <FilterBar
            filters={[
              { key: "filter", label: "Filter", value: activeFilter, options: filterOptions, onChange: setActiveFilter as (v: string) => void },
            ]}
            onClearAll={() => { setSearch(""); setActiveFilter("all"); }}
          />
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          keyExtractor={(row) => row.id}
          emptyState={{
            title: "No notifications found",
            description: activeFilter === "all" && !search ? "You have no notifications." : "Try adjusting your filters or search terms.",
          }}
        />
      </div>

      <DeleteConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

function KPICard({ label, value, icon, variant = "default" }: { label: string; value: number; icon: React.ReactNode; variant?: "default" | "success" | "warning" | "neutral" | "info" }) {
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

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ open, onClose, onConfirm }: DeleteConfirmModalProps) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Delete Notification" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">Are you sure you want to delete this notification? This action cannot be undone.</p>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} className="btn btn-danger">Delete</button>
        </div>
      </div>
    </Modal>
  );
}
