import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "../layouts/AppShell";
import { LoginPage } from "../../features/auth/LoginPage";
import { AcceptInvitePage } from "../../features/auth/AcceptInvitePage";
import { UserProfilePage } from "../../features/auth/UserProfilePage";
import { DashboardRouter } from "../../features/dashboard/DashboardRouter";
import { EmployeeDirectoryPage } from "../../features/employees/EmployeeDirectoryPage";
import { EmployeeProfilePage } from "../../features/employees/EmployeeProfilePage";
import { EmployeeFormPage } from "../../features/employees/EmployeeFormPage";
import { OnboardingDashboardPage } from "../../features/onboarding/OnboardingDashboardPage";
import { OnboardingWizardPage } from "../../features/onboarding/OnboardingWizardPage";
import { DocumentListPage } from "../../features/documents/DocumentListPage";
import { DocumentDetailPage } from "../../features/documents/DocumentDetailPage";
import { AttendanceDashboardPage } from "../../features/attendance/AttendanceDashboardPage";
import { AttendanceDetailPage } from "../../features/attendance/AttendanceDetailPage";
import { LeaveDashboardPage } from "../../features/leave/LeaveDashboardPage";
import { LeaveRequestPage } from "../../features/leave/LeaveRequestPage";
import { LeaveDetailPage } from "../../features/leave/LeaveDetailPage";
import { ClientDashboardPage } from "../../features/clients/ClientDashboardPage";
import { ClientDetailPage } from "../../features/clients/ClientDetailPage";
import { ProjectDashboardPage } from "../../features/projects/ProjectDashboardPage";
import { ProjectDetailPage } from "../../features/projects/ProjectDetailPage";
import { ReviewDashboardPage } from "../../features/reviews/ReviewDashboardPage";
import { ReviewDetailPage } from "../../features/reviews/ReviewDetailPage";
import { ReportCenterPage } from "../../features/reports/ReportCenterPage";
import { NotificationCenterPage } from "../../features/notifications/NotificationCenterPage";
import { AuditLogPage } from "../../features/audit/AuditLogPage";
import { SettingsPage } from "../../features/settings/SettingsPage";
import { AssignmentsDashboardPage } from "../../features/assignments/AssignmentsDashboardPage";
import { AnalyticsDashboardPage } from "../../features/analytics/AnalyticsDashboardPage";
import { useAuth } from "../../features/auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { PageSkeleton } from "../../components/ui/PageSkeleton";
import { useLoadingVisible } from "../../lib/useLoadingVisible";
import type { Permission } from "../../types";

function RouteLoading() {
  return <PageSkeleton />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, backendReady } = useAuth();
  const showSkeleton = useLoadingVisible(isLoading || !backendReady);
  if (isLoading || !backendReady) {
    return showSkeleton ? <RouteLoading /> : null;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PermissionGuard({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission: Permission;
}) {
  const { user } = useAuth();
  if (!user || !hasPermission(user.role, permission)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}

function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">403</h1>
        <p className="text-lg text-gray-600 mb-2">Access Restricted</p>
        <p className="text-sm text-gray-500 mb-6">You do not have permission to access this page.</p>
        <a href="/dashboard" className="btn btn-primary">Return to Dashboard</a>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/accept-invite",
    element: <AcceptInvitePage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardRouter />,
      },
      {
        path: "employees",
        element: (
          <PermissionGuard permission="employee.view">
            <EmployeeDirectoryPage />
          </PermissionGuard>
        ),
      },
      {
        path: "employees/new",
        element: (
          <PermissionGuard permission="employee.create">
            <EmployeeFormPage />
          </PermissionGuard>
        ),
      },
      {
        path: "employees/:employeeId",
        element: (
          <PermissionGuard permission="employee.view">
            <EmployeeProfilePage />
          </PermissionGuard>
        ),
      },
      {
        path: "employees/:employeeId/edit",
        element: (
          <PermissionGuard permission="employee.edit">
            <EmployeeFormPage />
          </PermissionGuard>
        ),
      },
      {
        path: "onboarding",
        element: (
          <PermissionGuard permission="onboarding.manage">
            <OnboardingDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "onboarding/:employeeId",
        element: (
          <PermissionGuard permission="onboarding.manage">
             <OnboardingWizardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "documents",
        element: (
          <PermissionGuard permission="document.view">
            <DocumentListPage />
          </PermissionGuard>
        ),
      },
      {
        path: "documents/:documentId",
        element: (
          <PermissionGuard permission="document.view">
            <DocumentDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: "attendance",
        element: (
          <PermissionGuard permission="attendance.view">
            <AttendanceDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "attendance/:employeeId",
        element: (
          <PermissionGuard permission="attendance.view">
            <AttendanceDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: "leave",
        element: (
          <PermissionGuard permission="leave.view">
            <LeaveDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "leave/request",
        element: (
          <PermissionGuard permission="leave.view">
            <LeaveRequestPage />
          </PermissionGuard>
        ),
      },
      {
        path: "leave/:requestId",
        element: (
          <PermissionGuard permission="leave.view">
            <LeaveDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: "reviews",
        element: (
          <PermissionGuard permission="review.view">
            <ReviewDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "reviews/:reviewId",
        element: (
          <PermissionGuard permission="review.view">
            <ReviewDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: "clients",
        element: (
          <PermissionGuard permission="client.view">
            <ClientDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "clients/:clientId",
        element: (
          <PermissionGuard permission="client.view">
            <ClientDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: "projects",
        element: (
          <PermissionGuard permission="project.view">
            <ProjectDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "projects/:projectId",
        element: (
          <PermissionGuard permission="project.view">
            <ProjectDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: "assignments",
        element: (
          <PermissionGuard permission="assignment.view">
            <AssignmentsDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "analytics",
        element: (
          <PermissionGuard permission="report.view">
            <AnalyticsDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "reports",
        element: (
          <PermissionGuard permission="report.view">
            <ReportCenterPage />
          </PermissionGuard>
        ),
      },
      {
        path: "notifications",
        element: (
          <PermissionGuard permission="notification.view">
            <NotificationCenterPage />
          </PermissionGuard>
        ),
      },
      {
        path: "audit-log",
        element: (
          <PermissionGuard permission="audit.view">
            <AuditLogPage />
          </PermissionGuard>
        ),
      },
      {
        path: "settings",
        element: (
          <PermissionGuard permission="settings.manage">
            <SettingsPage />
          </PermissionGuard>
        ),
      },
      {
        path: "profile",
        element: (
          <PermissionGuard permission="profile.edit">
            <UserProfilePage />
          </PermissionGuard>
        ),
      },
      {
        path: "403",
        element: <ForbiddenPage />,
      },
      {
        path: "*",
        element: (
          <div className="page-container">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
            <p className="text-lg text-gray-600 mb-6">Page not found.</p>
            <a href="/dashboard" className="btn btn-primary">Return to Dashboard</a>
          </div>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/404" replace />,
  },
]);
