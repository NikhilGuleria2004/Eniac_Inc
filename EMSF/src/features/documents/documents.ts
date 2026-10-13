import type { Document, Employee } from "../../types";

/** Roles that may only see their own documents (§17 Supervisor, §18 Employee). */
export const OWN_DOCUMENT_ROLES = ["SUPERVISOR", "EMPLOYEE"] as const;

export type ExpiryState = "EXPIRED" | "EXPIRING_SOON" | "NONE" | "NO_EXPIRY";

/** Window (days) in which a document is considered "Expiring Soon". */
export const EXPIRY_SOON_DAYS = 30;

/**
 * Expiry indicator for a document. Deterministic given `today`
 * (defaults to the current calendar date).
 */
export function getExpiryState(doc: Document, today: string = new Date().toISOString().split("T")[0]): ExpiryState {
  if (!doc.expiryDate) return "NO_EXPIRY";
  if (doc.status === "EXPIRED" || doc.expiryDate < today) return "EXPIRED";
  const t = new Date(today + "T00:00:00Z").getTime();
  const e = new Date(doc.expiryDate + "T00:00:00Z").getTime();
  const days = (e - t) / 86_400_000;
  if (days <= EXPIRY_SOON_DAYS) return "EXPIRING_SOON";
  return "NONE";
}

/** §42 dashboard KPI row. */
export interface DocumentKpis {
  total: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  expiringSoon: number;
  expired: number;
}

export function getDocumentKpis(docs: Document[], today?: string): DocumentKpis {
  const kpis: DocumentKpis = { total: docs.length, pendingReview: 0, approved: 0, rejected: 0, expiringSoon: 0, expired: 0 };
  for (const d of docs) {
    if (d.status === "PENDING" || d.status === "UNDER_REVIEW") kpis.pendingReview++;
    if (d.status === "APPROVED") kpis.approved++;
    if (d.status === "REJECTED") kpis.rejected++;
    const expiry = getExpiryState(d, today);
    if (expiry === "EXPIRING_SOON") kpis.expiringSoon++;
    if (expiry === "EXPIRED") kpis.expired++;
  }
  return kpis;
}

export interface DocumentFilterInput {
  search: string;
  employeeId: string;
  type: string;
  status: string;
  expiry: string;
  country: string;
}

export function filterDocuments(
  docs: Document[],
  employees: Employee[],
  filters: DocumentFilterInput,
  today?: string
): Document[] {
  const q = filters.search.trim().toLowerCase();
  return docs.filter((d) => {
    if (filters.employeeId !== "all" && d.employeeId !== filters.employeeId) return false;
    if (filters.type !== "all" && d.type !== filters.type) return false;
    if (filters.status !== "all" && d.status !== filters.status) return false;
    if (filters.country !== "all") {
      const emp = employees.find((e) => e.id === d.employeeId);
      if (emp?.country !== filters.country) return false;
    }
    if (filters.expiry !== "all") {
      const state = getExpiryState(d, today);
      if (filters.expiry === "EXPIRING_SOON" && state !== "EXPIRING_SOON") return false;
      if (filters.expiry === "EXPIRED" && state !== "EXPIRED") return false;
      if (filters.expiry === "NO_EXPIRY" && state !== "NO_EXPIRY") return false;
      if (filters.expiry === "VALID" && (state === "EXPIRED" || state === "EXPIRING_SOON")) return false;
    }
    if (!q) return true;
    const emp = employees.find((e) => e.id === d.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : "";
    return (
      d.name.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q) ||
      empName.includes(q)
    );
  });
}

/** §17/§18 scoping: own-document roles only see their own records. */
export function scopeDocumentsForRole(
  docs: Document[],
  role: string,
  userId: string | undefined
): Document[] {
  if ((OWN_DOCUMENT_ROLES as readonly string[]).includes(role)) {
    if (!userId) return [];
    return docs.filter((d) => d.employeeId === userId);
  }
  return docs;
}

/** §43: Reject and Request Changes require a comment; Approve does not. */
export function commentRequired(decision: "APPROVED" | "REJECTED" | "CHANGES"): boolean {
  return decision !== "APPROVED";
}

/** Expiry cell display, e.g. "in 12 days" / "expired 2026-01-01". */
export function formatExpiry(doc: Document, today: string = new Date().toISOString().split("T")[0]): string {
  if (!doc.expiryDate) return "—";
  const state = getExpiryState(doc, today);
  if (state === "EXPIRED") return `${doc.expiryDate} (expired)`;
  if (state === "EXPIRING_SOON") {
    const t = new Date(today + "T00:00:00Z").getTime();
    const e = new Date(doc.expiryDate + "T00:00:00Z").getTime();
    const days = Math.round((e - t) / 86_400_000);
    return `${doc.expiryDate} (${days} day${days === 1 ? "" : "s"} left)`;
  }
  return doc.expiryDate;
}
