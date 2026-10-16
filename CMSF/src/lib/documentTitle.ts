import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TITLES: [RegExp, string][] = [
  [/^\/login$/, "Sign In"],
  [/^\/dashboard$/, "Dashboard"],
  [/^\/clients/, "Clients"],
  [/^\/projects/, "Projects"],
  [/^\/assignments/, "Project Assignments"],
  [/^\/daily-logs/, "Daily Work Logs"],
  [/^\/timesheets/, "Timesheets"],
  [/^\/invoices/, "Invoices"],
  [/^\/reports/, "Reports"],
  [/^\/analytics/, "Analytics"],
  [/^\/notifications/, "Notifications"],
  [/^\/audit-log/, "Audit Log"],
  [/^\/settings/, "Settings"],
  [/^\/profile/, "My Profile"],
  [/^\/403/, "Access Restricted"],
];

export function titleForPath(pathname: string): string {
  for (const [re, title] of TITLES) {
    if (re.test(pathname)) return title;
  }
  return "Client Management System";
}

export function setDocumentTitle(pathname: string): void {
  document.title = `${titleForPath(pathname)} — Eniac INC. CMS`;
}

export function useDocumentTitle(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    setDocumentTitle(pathname);
  }, [pathname]);
}
