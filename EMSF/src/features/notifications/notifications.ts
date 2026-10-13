import type { Notification } from "../../types";

export type NotificationFilter = "all" | "unread" | "mentions" | "approvals" | "system";

export interface NotificationKPIs {
  total: number;
  unread: number;
  read: number;
  mentions: number;
  approvals: number;
  system: number;
}

export interface NotificationFilters {
  search: string;
  filter: NotificationFilter;
}

export function computeNotificationKPIs(notifications: Notification[]): NotificationKPIs {
  const unread = notifications.filter((n) => !n.read);
  return {
    total: notifications.length,
    unread: unread.length,
    read: notifications.length - unread.length,
    mentions: 0,
    approvals: 0,
    system: notifications.filter((n) => n.type === "SYSTEM").length,
  };
}

export function filterNotifications(notifications: Notification[], filters: NotificationFilters): Notification[] {
  return notifications.filter((n) => {
    const matchesSearch =
      filters.search === "" ||
      n.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      n.message.toLowerCase().includes(filters.search.toLowerCase());

    let matchesFilter = true;
    switch (filters.filter) {
      case "all": break;
      case "unread": matchesFilter = !n.read; break;
      case "mentions": matchesFilter = n.type === "PROJECT" || n.type === "DOCUMENT"; break;
      case "approvals": matchesFilter = n.type === "LEAVE" || n.type === "DOCUMENT" || n.type === "ONBOARDING"; break;
      case "system": matchesFilter = n.type === "SYSTEM" || n.type === "ATTENDANCE"; break;
    }

    return matchesSearch && matchesFilter;
  });
}

export function getNotificationTypeLabel(type: Notification["type"]): string {
  const labels: Record<Notification["type"], string> = {
    LEAVE: "Leave",
    DOCUMENT: "Document",
    PROJECT: "Project",
    ONBOARDING: "Onboarding",
    ATTENDANCE: "Attendance",
    SYSTEM: "System",
  };
  return labels[type];
}

export function getNotificationTypeColor(type: Notification["type"]): string {
  const colors: Record<Notification["type"], string> = {
    LEAVE: "bg-green-100 text-green-800",
    DOCUMENT: "bg-blue-100 text-blue-800",
    PROJECT: "bg-purple-100 text-purple-800",
    ONBOARDING: "bg-amber-100 text-amber-800",
    ATTENDANCE: "bg-indigo-100 text-indigo-800",
    SYSTEM: "bg-gray-100 text-gray-800",
  };
  return colors[type];
}

export function getNotificationTypeIcon(type: Notification["type"]): string {
  const icons: Record<Notification["type"], string> = {
    LEAVE: "calendar",
    DOCUMENT: "file",
    PROJECT: "briefcase",
    ONBOARDING: "user-plus",
    ATTENDANCE: "clock",
    SYSTEM: "bell",
  };
  return icons[type];
}

export const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "mentions", label: "Mentions" },
  { value: "approvals", label: "Approvals" },
  { value: "system", label: "System" },
] as const;
