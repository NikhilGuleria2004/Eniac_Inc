import { getEmployees, getDocuments, getLeaveRequests, getReviews } from "../../data/mock/repositories";
import { EmployeeDistributionChart } from "../../components/charts/EmployeeDistributionChart";
import { LeaveStatusChart } from "../../components/charts/LeaveStatusChart";
import { DocumentStatusChart } from "../../components/charts/DocumentStatusChart";
import { AttendanceMarker } from "../../components/dashboard/AttendanceMarker";
import {
  CHART_HUE,
  EMPLOYEE_STATUS_COLORS,
  DOCUMENT_STATUS_COLORS,
  CHART_SERIES_COLORS,
  CHART_FALLBACK_COLOR,
} from "../../components/charts/palette";

export function HRDashboard() {
  const employees = getEmployees();
  const documents = getDocuments();
  const leaveRequests = getLeaveRequests();
  const reviews = getReviews();

  const totalEmployees = employees.length;
  const pendingOnboarding = employees.filter((e) => e.employmentStatus === "ONBOARDING").length;
  const pendingDocuments = documents.filter((d) => d.status === "PENDING" || d.status === "UNDER_REVIEW").length;
  const pendingLeaveRequests = leaveRequests.filter((l) => l.status === "PENDING").length;
  const upcomingReviews = reviews.filter((r) => r.status === "SCHEDULED" || r.status === "IN_PROGRESS").length;
  const documentExpiringSoon = documents.filter((d) => d.expiryDate && new Date(d.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && d.status !== "EXPIRED").length;

  const indiaCount = employees.filter((e) => e.country === "India").length;
  const usCount = employees.filter((e) => e.country === "United States").length;
  const billableCount = employees.filter((e) => e.billingStatus === "BILLABLE").length;
  const nonBillableCount = employees.filter((e) => e.billingStatus === "NON_BILLABLE").length;

  // --- Chart Data Computation ---
  // Employee Distribution: Country, Billing Status, Employment Status
  const countryData = [
    { name: "India", value: indiaCount, fill: CHART_HUE.blue },
    { name: "United States", value: usCount, fill: CHART_HUE.bluishGreen },
  ];
  const billingData = [
    { name: "Billable", value: billableCount, fill: CHART_HUE.blue },
    { name: "Non-Billable", value: nonBillableCount, fill: CHART_HUE.gray },
  ];
  const statusData = employees.reduce((acc, e) => {
    acc[e.employmentStatus] = (acc[e.employmentStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const employmentStatusData = Object.entries(statusData).map(([name, value]) => ({
    name,
    value,
    fill: EMPLOYEE_STATUS_COLORS[name] || CHART_FALLBACK_COLOR,
  }));

  // Leave Status Distribution
  const leaveTypeCounts = leaveRequests.reduce((acc, l) => {
    acc[l.type] = (acc[l.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const leaveStatusCounts = leaveRequests.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Document Status Distribution
  const documentStatusCounts = documents.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const documentStatusData = Object.entries(documentStatusCounts).map(([status, count]) => ({
    status,
    count,
    fill: DOCUMENT_STATUS_COLORS[status] || CHART_FALLBACK_COLOR,
  }));

  // Onboarding Pipeline Stages
  const onboardingStages = [
    { stage: "New", count: employees.filter((e) => e.employmentStatus === "ONBOARDING").length, color: CHART_SERIES_COLORS[0] },
    { stage: "Onboarding", count: pendingOnboarding, color: CHART_SERIES_COLORS[1] },
    { stage: "Documents Pending", count: pendingDocuments, color: CHART_SERIES_COLORS[2] },
    { stage: "HR Review", count: documents.filter((d) => d.status === "UNDER_REVIEW").length, color: CHART_SERIES_COLORS[3] },
    { stage: "Ready", count: employees.filter((e) => e.timesheetEligibility === "ELIGIBLE").length, color: CHART_SERIES_COLORS[4] },
    { stage: "Completed", count: employees.filter((e) => e.timesheetEligibility === "PROVISIONED").length, color: CHART_SERIES_COLORS[5] },
  ];

  // Upcoming Reviews - real data
  const upcomingReviewsData = reviews
    .filter((r) => r.status === "SCHEDULED" || r.status === "IN_PROGRESS")
    .sort((a, b) => new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime())
    .slice(0, 5);

  return (
     <div className="page-container space-y-6">
       <div>
         <h1 className="text-xl font-semibold text-gray-900">Human Resources Dashboard</h1>
         <p className="text-sm text-gray-500 mt-1">Employee lifecycle, compliance and workforce operations</p>
       </div>

      <AttendanceMarker />


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Employees" value={totalEmployees.toString()} />
        <StatCard label="Pending Onboarding" value={pendingOnboarding.toString()} />
        <StatCard label="Pending Documents" value={pendingDocuments.toString()} />
        <StatCard label="Pending Leave Requests" value={pendingLeaveRequests.toString()} />
        <StatCard label="Upcoming Reviews" value={upcomingReviews.toString()} />
        <StatCard label="Document Expiring Soon" value={documentExpiringSoon.toString()} />
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Onboarding Pipeline</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {onboardingStages.map(({ stage, count, color }) => (
            <div key={stage} className="text-center p-3 bg-gray-50 rounded-md relative">
              <div className="w-full h-1.5 bg-gray-200 mb-2 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${Math.min((count / Math.max(1, totalEmployees)) * 100, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-500 mb-1">{stage}</p>
              <p className="text-lg font-semibold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Employee Distribution</h3>
            <div className="h-64">
              <EmployeeDistributionChart
                countryData={countryData}
                billingData={billingData}
                employmentStatusData={employmentStatusData}
              />
            </div>
          </div>

          <div className="card lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Leave & Document Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-64">
                <LeaveStatusChart
                  leaveTypeCounts={leaveTypeCounts}
                  leaveStatusCounts={leaveStatusCounts}
                />
              </div>
              <div className="h-64">
                <DocumentStatusChart
                  documentStatusData={documentStatusData}
                />
              </div>
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Pending Actions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Employee</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Action</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Priority</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Due Date</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.slice(0, 4).map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900">{emp.firstName} {emp.lastName}</td>
                    <td className="py-2 px-3 text-gray-600">Document Review</td>
                    <td className="py-2 px-3">
                      <span className="badge badge-warning">High</span>
                    </td>
                    <td className="py-2 px-3 text-gray-600">12 Oct 2026</td>
                    <td className="py-2 px-3">
                      <span className="badge badge-info">Pending</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Upcoming Reviews</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Employee</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Reviewer</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Review Period</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Due Date</th>
                  <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingReviewsData.length > 0 ? (
                  upcomingReviewsData.map((review) => {
                    const employee = employees.find((e) => e.id === review.employeeId);
                    const reviewer = employees.find((e) => e.id === review.reviewerId);
                    return (
                      <tr key={review.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-900">{employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}</td>
                        <td className="py-2 px-3 text-gray-600">{reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "Unknown"}</td>
                        <td className="py-2 px-3 text-gray-600">{review.reviewPeriod}</td>
                        <td className="py-2 px-3 text-gray-600">{new Date(review.reviewDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="py-2 px-3">
                          <span className={`badge ${review.status === "SCHEDULED" ? "badge-info" : review.status === "IN_PROGRESS" ? "badge-warning" : "badge-neutral"}`}>
                            {review.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">No upcoming reviews</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card min-w-0">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider break-words">{label}</p>
      <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 break-words">{value}</p>
    </div>
  );
}
