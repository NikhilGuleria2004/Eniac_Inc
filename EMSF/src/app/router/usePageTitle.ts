import { useEffect } from "react";

const SUFFIX = " · Eniac INC.";
const DEFAULT_TITLE = "Eniac INC. - Employee Management System";

/** Sets document.title to reflect the current context (accurate page titles). */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title}${SUFFIX}` : DEFAULT_TITLE;
  }, [title]);
}

/**
 * Derives a page title from the current pathname so every route (including
 * dashboards without a PageHeader) reports an accurate <title>.
 */
export function titleForPath(pathname: string): string | undefined {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "Dashboard";
  const [a, b, c] = parts;

  switch (a) {
    case "dashboard":
      return "Dashboard";
    case "employees":
      if (b === "new") return "Add Employee";
      if (!b) return "Employee Directory";
      return c === "edit" ? "Edit Employee" : "Employee Profile";
    case "onboarding":
      return b ? "Onboarding Detail" : "Onboarding";
    case "documents":
      return b ? "Document Detail" : "Documents";
    case "attendance":
      return b ? "Attendance Detail" : "Attendance";
    case "leave":
      if (b === "request") return "Request Leave";
      return b ? "Leave Request" : "Leave";
    case "reviews":
      return b ? "Review Detail" : "Reviews";
    case "clients":
      return b ? "Client Detail" : "Clients";
    case "projects":
      return b ? "Project Detail" : "Projects";
    case "assignments":
      return "Assignments";
    case "analytics":
      return "Analytics";
    case "reports":
      return "Reports";
    case "notifications":
      return "Notifications";
    case "audit-log":
      return "Audit Log";
    case "settings":
      return "Settings";
    case "profile":
      return "My Profile";
    case "403":
      return "Access Restricted";
    default:
      return "Page Not Found";
  }
}
