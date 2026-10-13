import type { AuditLog } from "../../types";

export interface AuditKPIs {
  totalLogs: number;
  criticalActions: number;
  uniqueUsers: number;
  todayCount: number;
}

export interface AuditFilters {
  search: string;
  user: string;
  role: string;
  action: string;
  entity: string;
  date: string;
}

export function computeAuditKPIs(logs: AuditLog[]): AuditKPIs {
  const today = new Date().toISOString().split("T")[0];
  const todayCount = logs.filter((l) => l.timestamp.startsWith(today)).length;
  const criticalActions = logs.filter((l) => ["DEACTIVATE", "DELETE", "APPROVE", "REJECT"].includes(l.action)).length;
  const uniqueUsers = new Set(logs.map((l) => l.userId)).size;

  return {
    totalLogs: logs.length,
    criticalActions,
    uniqueUsers,
    todayCount,
  };
}

export function filterAuditLogs(logs: AuditLog[], filters: AuditFilters): AuditLog[] {
  return logs.filter((log) => {
    const matchesSearch =
      filters.search === "" ||
      log.description.toLowerCase().includes(filters.search.toLowerCase()) ||
      log.userName.toLowerCase().includes(filters.search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(filters.search.toLowerCase());

    const matchesUser = filters.user === "all" || log.userId === filters.user;
    const matchesRole = filters.role === "all" || log.role === filters.role;
    const matchesAction = filters.action === "all" || log.action === filters.action;
    const matchesEntity = filters.entity === "all" || log.entity === filters.entity;
    const matchesDate = filters.date === "all" || log.timestamp.startsWith(filters.date);

    return matchesSearch && matchesUser && matchesRole && matchesAction && matchesEntity && matchesDate;
  });
}

export function getUniqueAuditUsers(logs: AuditLog[]): { id: string; name: string; role: string }[] {
  const seen = new Map<string, { id: string; name: string; role: string }>();
  logs.forEach((l) => {
    if (!seen.has(l.userId)) {
      seen.set(l.userId, { id: l.userId, name: l.userName, role: l.role });
    }
  });
  return Array.from(seen.values());
}

export function getUniqueAuditRoles(logs: AuditLog[]): string[] {
  return [...new Set(logs.map((l) => l.role))].sort();
}

export function getUniqueAuditActions(): AuditLog["action"][] {
  return ["CREATE", "UPDATE", "APPROVE", "REJECT", "ASSIGN", "DEACTIVATE", "LOGIN"];
}

export function getUniqueAuditEntities(): AuditLog["entity"][] {
  return ["EMPLOYEE", "CLIENT", "PROJECT", "DOCUMENT", "LEAVE", "ATTENDANCE", "REVIEW"];
}

export function getActionColor(action: AuditLog["action"]): string {
  const colors: Record<string, string> = {
    CREATE: "bg-blue-100 text-blue-800",
    UPDATE: "bg-amber-100 text-amber-800",
    APPROVE: "bg-green-100 text-green-800",
    REJECT: "bg-red-100 text-red-800",
    ASSIGN: "bg-purple-100 text-purple-800",
    DEACTIVATE: "bg-gray-100 text-gray-800",
    LOGIN: "bg-indigo-100 text-indigo-800",
  };
  return colors[action] || "bg-gray-100 text-gray-800";
}

export function getEntityLabel(entity: AuditLog["entity"]): string {
  const labels: Record<string, string> = {
    EMPLOYEE: "Employee",
    CLIENT: "Client",
    PROJECT: "Project",
    DOCUMENT: "Document",
    LEAVE: "Leave",
    ATTENDANCE: "Attendance",
    REVIEW: "Review",
  };
  return labels[entity] || entity;
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDateOptions(logs: AuditLog[]): { label: string; value: string }[] {
  const dates = [...new Set(logs.map((l) => l.timestamp.split("T")[0]))].sort().reverse();
  return [{ label: "All Dates", value: "all" }, ...dates.map((d) => ({ label: d, value: d }))];
}
