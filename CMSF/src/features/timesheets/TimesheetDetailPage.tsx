import { useMemo, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { CheckCircle2, XCircle, Download, CalendarClock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { StatusBadge } from "../../components/data/StatusBadge";
import { PageHeader } from "../../components/layout/PageHeader";
import { TimesheetHoursChart } from "../../components/charts/TimesheetHoursChart";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import {
  getTimesheets,
  getDailyLogs,
  getProjects,
  getClients,
  approveTimesheet,
  rejectTimesheet,
  markPaidTimesheet,
} from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { formatCurrency } from "../../lib/charts";
import { canApprove, canReject, canMarkPaid, isOverdue } from "./timesheets";
import { TimesheetReviewModal } from "./TimesheetReviewModal";

export function TimesheetDetailPage() {
  const { timesheetId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [reviewOpen, setReviewOpen] = useState<{ mode: "approve" | "reject" } | null>(null);

  const timesheet = getTimesheets().find((t) => t.id === timesheetId);
  const projects = useMemo(() => getProjects(), []);
  const clients = useMemo(() => getClients(), []);
  const logs = useMemo(
    () => (timesheet ? getDailyLogs().filter((d) => timesheet.dailyLogIds.includes(d.id)) : []),
    [timesheet]
  );

  if (!timesheet) {
    return (
      <div className="page-container">
        <p className="text-sm text-gray-500">Timesheet not found.</p>
        <button className="btn btn-secondary mt-4" onClick={() => navigate(ROUTES.TIMESHEETS)}>Back to Timesheets</button>
      </div>
    );
  }

  const canViewAll = hasPermission(user?.role ?? "EMPLOYEE", "timesheet.view_all");
  const isOwner = user?.role === "EMPLOYEE" && user?.employeeId === timesheet.employeeId;
  if (!canViewAll && !isOwner) {
    return <Navigate to="/403" replace />;
  }

  const canReview = hasPermission(user?.role ?? "EMPLOYEE", "timesheet.approve") || hasPermission(user?.role ?? "EMPLOYEE", "timesheet.reject");
  const reviewerName = user ? `${user.firstName} ${user.lastName}` : "";

  const hoursData = timesheet.projectBreakdown.map((pb) => ({ name: pb.projectName, hours: pb.billableHours }));

  const activity = [
    { label: "Created", at: timesheet.createdAt },
    ...(timesheet.submittedAt ? [{ label: "Submitted", at: timesheet.submittedAt }] : []),
    ...(timesheet.reviewedAt ? [{ label: `Reviewed (${timesheet.status})`, at: timesheet.reviewedAt }] : []),
    ...(timesheet.approvedAt ? [{ label: "Approved", at: timesheet.approvedAt }] : []),
    ...(timesheet.paidAt ? [{ label: "Paid", at: timesheet.paidAt }] : []),
  ];

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={`Timesheet #${timesheet.id}`}
        subtitle={`${timesheet.employeeName} · ${timesheet.periodLabel}`}
        actions={
          <>
            {isOverdue(timesheet) && <span className="badge badge-warning">Overdue</span>}
            {canReview && canApprove(timesheet.status) && (
              <button className="btn btn-primary" onClick={() => setReviewOpen({ mode: "approve" })}><CheckCircle2 size={16} className="mr-2" />Approve</button>
            )}
            {canReview && canReject(timesheet.status) && (
              <button className="btn btn-danger" onClick={() => setReviewOpen({ mode: "reject" })}><XCircle size={16} className="mr-2" />Reject</button>
            )}
            {user?.role === "ADMIN" && canMarkPaid(timesheet.status) && (
              <button className="btn btn-secondary" onClick={() => { markPaidTimesheet(timesheet.id); addToast("success", "Timesheet marked paid"); }}>Mark as Paid</button>
            )}
            <button className="btn btn-secondary" onClick={() => addToast("info", "PDF download simulated")}><Download size={16} className="mr-2" />PDF</button>
          </>
        }
      />

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <CalendarClock size={16} className="text-gray-400" />
        <span>Period: {timesheet.periodStart} → {timesheet.periodEnd}</span>
        <span className="ml-2"><StatusBadge status={timesheet.status} kind="timesheet" /></span>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Daily Logs</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Timesheet Information</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm sm:grid-cols-3">
              <InfoItem label="Employee" value={`${timesheet.employeeName}`} />
              <InfoItem label="Period" value={timesheet.periodLabel} />
              <InfoItem label="Billing Period" value={`#${timesheet.billingPeriod}`} />
              <InfoItem label="Total Days" value={String(timesheet.totalDays)} />
              <InfoItem label="Status" value={timesheet.status} />
              <InfoItem label="Submitted" value={timesheet.submittedAt ? new Date(timesheet.submittedAt).toLocaleDateString() : "—"} />
              <InfoItem label="Reviewed By" value={timesheet.reviewedBy ?? "—"} />
              <InfoItem label="Reviewed Date" value={timesheet.reviewedAt ? new Date(timesheet.reviewedAt).toLocaleDateString() : "—"} />
            </dl>
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Project Summary</h2>
            {timesheet.projectBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No project breakdown.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 px-3">Project</th><th className="py-2 px-3">Client</th>
                    <th className="py-2 px-3">Bill Rate</th><th className="py-2 px-3">Billable Hours</th><th className="py-2 px-3">Amount</th>
                  </tr></thead>
                  <tbody>
                    {timesheet.projectBreakdown.map((pb) => {
                      const proj = projects.find((p) => p.id === pb.projectId);
                      const client = proj ? clients.find((c) => c.id === proj.clientId) : undefined;
                      return (
                        <tr key={pb.projectId} className="border-b border-gray-100">
                          <td className="py-2 px-3 text-gray-900">{pb.projectName}</td>
                          <td className="py-2 px-3">{client?.name ?? "—"}</td>
                          <td className="py-2 px-3">{formatCurrency(pb.employeeBillRate)}/h</td>
                          <td className="py-2 px-3">{pb.billableHours} h</td>
                          <td className="py-2 px-3">{formatCurrency(pb.billableAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="pt-6">
          <div className="card">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">No daily logs in this timesheet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 px-3">Date</th><th className="py-2 px-3">Day</th><th className="py-2 px-3">Project</th>
                    <th className="py-2 px-3">Description</th><th className="py-2 px-3">Regular</th><th className="py-2 px-3">OT</th>
                    <th className="py-2 px-3">Total</th><th className="py-2 px-3">Billable</th><th className="py-2 px-3">Status</th>
                  </tr></thead>
                  <tbody>
                    {logs.map((d) => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="py-2 px-3">{d.workDate}</td>
                        <td className="py-2 px-3">{d.dayOfWeek}</td>
                        <td className="py-2 px-3">{d.projectName}</td>
                        <td className="py-2 px-3 max-w-xs text-gray-600">{d.description}</td>
                        <td className="py-2 px-3">{d.regularHours}</td>
                        <td className="py-2 px-3">{d.overtimeHours}</td>
                        <td className="py-2 px-3">{d.totalHours}</td>
                        <td className="py-2 px-3">{d.billable ? "Yes" : "No"}</td>
                        <td className="py-2 px-3"><StatusBadge status={d.status === "DRAFT" ? "SUSPENDED" : "ACTIVE"} label={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6 pt-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Hours Summary</h2>
              <dl className="grid grid-cols-3 gap-y-2 text-sm">
                <InfoItem label="Regular" value={`${timesheet.totalRegularHours} h`} />
                <InfoItem label="Overtime" value={`${timesheet.totalOvertimeHours} h`} />
                <InfoItem label="Total" value={`${timesheet.totalHours} h`} />
              </dl>
              <h2 className="mt-5 mb-3 text-sm font-semibold text-gray-900">Financial Summary</h2>
              <dl className="grid grid-cols-3 gap-y-2 text-sm">
                <InfoItem label="Billable Hours" value={`${timesheet.totalBillableHours} h`} />
                <InfoItem label="Billable Amount" value={formatCurrency(timesheet.billableAmount, timesheet.currency)} />
                <InfoItem label="Currency" value={timesheet.currency} />
              </dl>
            </div>
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Hours by Project</h2>
              <div className="h-64">
                <TimesheetHoursChart data={hoursData} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="pt-6">
          <ul className="card divide-y divide-gray-100 text-sm">
            {activity.map((a, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="text-gray-900">{a.label}</span>
                <span className="text-gray-500">{new Date(a.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      {reviewOpen && (
        <TimesheetReviewModal
          open
          timesheet={timesheet}
          mode={reviewOpen.mode}
          reviewerName={reviewerName}
          onClose={() => setReviewOpen(null)}
          onApprove={(id, notes) => approveTimesheet(id, reviewerName, notes)}
          onReject={(id, notes) => rejectTimesheet(id, reviewerName, notes)}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}
