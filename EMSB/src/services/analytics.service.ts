import { getDb } from "../config/database.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function periodLabel(periodStart?: string, periodEnd?: string): string {
  if (!periodStart) return "—";
  const s = new Date(`${periodStart.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(s.getTime())) return periodStart;
  if (!periodEnd) return `${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
  const e = new Date(`${periodEnd.slice(0, 10)}T00:00:00`);
  return `${MONTHS[s.getMonth()]} ${s.getDate()}-${e.getDate()}, ${s.getFullYear()}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface TimesheetKpis { total: number; pending: number; approved: number; rejected: number; inProgress: number; overdue: number }
export interface InvoiceKpis { total: number; draft: number; sent: number; paid: number; overdue: number; void: number; totalBilled: number }

export class AnalyticsService {
  private col(name: string) {
    return getDb().collection(name);
  }

  async timesheetKpis(): Promise<TimesheetKpis> {
    const docs = await this.col("timesheets").find({}).toArray();
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let inProgress = 0;
    let overdue = 0;
    const today = todayIso();
    for (const t of docs) {
      const status = t.status as string;
      if (status === "SUBMITTED" || status === "IN_REVIEW") {
        pending += 1;
        if (t.periodEnd && String(t.periodEnd).slice(0, 10) < today) overdue += 1;
      }
      if (status === "APPROVED") approved += 1;
      if (status === "REJECTED") rejected += 1;
      if (status === "DRAFT" || status === "REVISED") inProgress += 1;
    }
    return { total: docs.length, pending, approved, rejected, inProgress, overdue };
  }

  async invoiceKpis(): Promise<InvoiceKpis> {
    const docs = await this.col("invoices").find({}).toArray();
    let draft = 0;
    let sent = 0;
    let paid = 0;
    let voidCount = 0;
    let overdue = 0;
    let totalBilled = 0;
    const today = todayIso();
    for (const inv of docs) {
      const status = inv.status as string;
      const draftStatus = status === "DRAFT";
      if (draftStatus) draft += 1;
      if (status === "VOID" || status === "CANCELLED") voidCount += 1;
      if (status === "SENT") {
        sent += 1;
        if (String(inv.dueDate ?? "").slice(0, 10) < today) overdue += 1;
      }
      if (status === "PAID" || status === "PARTIAL") paid += 1;
      if (!draftStatus && status !== "VOID" && status !== "CANCELLED") {
        totalBilled += (inv.totalAmount as number | undefined) ?? 0;
      }
    }
    return { total: docs.length, draft, sent, paid, overdue, void: voidCount, totalBilled };
  }

  async revenueTrend(): Promise<{ label: string; revenue: number }[]> {
    const docs = await this.col("invoices").find({}).toArray();
    const map = new Map<string, { revenue: number; start: string; end: string }>();
    for (const inv of docs) {
      const status = inv.status as string;
      if (status === "DRAFT" || status === "VOID" || status === "CANCELLED") continue;
      const start = ((inv.periodStart as string | undefined) ?? (inv.issueDate as string)).slice(0, 10);
      const end = ((inv.periodEnd as string | undefined) ?? (inv.dueDate as string)).slice(0, 10);
      const key = `${start}|${end}`;
      const entry = map.get(key) ?? { revenue: 0, start, end };
      entry.revenue += (inv.totalAmount as number | undefined) ?? 0;
      map.set(key, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => (a.start < b.start ? -1 : 1))
      .slice(-6)
      .map((v) => ({ label: periodLabel(v.start, v.end), revenue: v.revenue }));
  }

  async topClients(limit = 8): Promise<{ name: string; revenue: number }[]> {
    const docs = await this.col("invoices").find({}).toArray();
    const map = new Map<string, number>();
    for (const inv of docs) {
      const status = inv.status as string;
      if (status === "DRAFT" || status === "VOID" || status === "CANCELLED") continue;
      map.set((inv.clientName as string) ?? "—", (map.get((inv.clientName as string) ?? "—") ?? 0) + ((inv.totalAmount as number | undefined) ?? 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, revenue]) => ({ name, revenue }));
  }

  async submissionRate(): Promise<{ label: string; submitted: number; pending: number }[]> {
    const docs = await this.col("timesheets").find({}).toArray();
    const map = new Map<string, { submitted: number; pending: number; start: string; end: string }>();
    for (const t of docs) {
      const start = ((t.periodStart as string | undefined) ?? "").slice(0, 10);
      const end = ((t.periodEnd as string | undefined) ?? "").slice(0, 10);
      const key = `${start}|${end}`;
      const entry = map.get(key) ?? { submitted: 0, pending: 0, start, end };
      const status = t.status as string;
      if (status === "APPROVED" || status === "PAID" || status === "IN_REVIEW") entry.submitted += 1;
      if (status === "SUBMITTED" || status === "DRAFT" || status === "REJECTED") entry.pending += 1;
      map.set(key, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => (a.start < b.start ? -1 : 1))
      .slice(-6)
      .map((v) => ({ label: periodLabel(v.start, v.end), submitted: v.submitted, pending: v.pending }));
  }

  async overview() {
    const [tKpis, iKpis, revenueTrend, topClients, submissionRate] = await Promise.all([
      this.timesheetKpis(),
      this.invoiceKpis(),
      this.revenueTrend(),
      this.topClients(),
      this.submissionRate()
    ]);

    const invoices = await this.col("invoices").find({}).toArray();
    const thisMonth = todayIso().slice(0, 7);
    let mrr = 0;
    for (const inv of invoices) {
      const status = inv.status as string;
      if (status === "DRAFT" || status === "VOID" || status === "CANCELLED") continue;
      if (String(inv.issueDate ?? "").slice(0, 7) === thisMonth) mrr += (inv.totalAmount as number | undefined) ?? 0;
    }

    const employees = await this.col("employees").find({}).toArray();
    const billableEmployees = employees.filter(
      (e) => e.billingStatus === "BILLABLE" && e.employmentStatus === "ACTIVE"
    ).length;
    const revenue = iKpis.totalBilled;
    const revenuePerEmployee = billableEmployees ? Math.round(revenue / billableEmployees) : 0;

    const clients = await this.col("clients").find({}).toArray();
    const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
    const clientRetentionRate = clients.length ? Math.round((activeClients / clients.length) * 100) : 0;

    const projects = await this.col("projects").find({}).toArray();
    const nonCancelled = projects.filter((p) => p.status !== "CANCELLED").length;
    const completed = projects.filter((p) => p.status === "COMPLETED").length;
    const projectSuccessRate = nonCancelled ? Math.round((completed / nonCancelled) * 100) : 0;

    let avgPaymentCycle = 0;
    const paidInvoices = invoices.filter((i) => (i.status as string) === "PAID");
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((s, inv) => {
        const end = inv.paidAt ? new Date(inv.paidAt as Date).getTime() : new Date(String(inv.dueDate ?? "")).getTime();
        const start = new Date(String(inv.issueDate ?? "")).getTime();
        return s + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
      }, 0);
      avgPaymentCycle = Math.round(totalDays / paidInvoices.length);
    }

    return {
      kpis: {
        mrr,
        billableHours: (await this.col("timesheets").find({ status: { $in: ["APPROVED", "PAID"] } }).toArray()).reduce(
          (s, t) => s + ((t.totalBillableHours as number | undefined) ?? 0),
          0
        ),
        revenuePerEmployee,
        clientRetentionRate,
        projectSuccessRate,
        avgPaymentCycle
      },
      timesheetKpis: tKpis,
      invoiceKpis: iKpis,
      revenueTrend,
      topClients,
      submissionRate
    };
  }
}
