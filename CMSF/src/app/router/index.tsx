import { createBrowserRouter, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AppShell } from "../layouts/AppShell";
import { LoginPage } from "../../features/auth/LoginPage";
import { DashboardPage } from "../../features/dashboard/DashboardPage";
import { ClientDashboardPage } from "../../features/clients/ClientDashboardPage";
import { ClientDetailPage } from "../../features/clients/ClientDetailPage";
import { ProjectDashboardPage } from "../../features/projects/ProjectDashboardPage";
import { ProjectDetailPage } from "../../features/projects/ProjectDetailPage";
import { AssignmentsDashboardPage } from "../../features/assignments/AssignmentsDashboardPage";
import { DailyLogsDashboardPage } from "../../features/dailylogs/DailyLogsDashboardPage";
import { DailyLogDetailPage } from "../../features/dailylogs/DailyLogDetailPage";
import { TimesheetsDashboardPage } from "../../features/timesheets/TimesheetsDashboardPage";
import { TimesheetDetailPage } from "../../features/timesheets/TimesheetDetailPage";
import { MyTimesheetsPage } from "../../features/timesheets/MyTimesheetsPage";
import { InvoicesDashboardPage } from "../../features/invoices/InvoicesDashboardPage";
import { InvoiceDetailPage } from "../../features/invoices/InvoiceDetailPage";
import { InvoiceComposerPage } from "../../features/invoices/InvoiceComposerPage";
import { InvoiceTemplatesPanel } from "../../features/invoices/InvoiceTemplatesPanel";
import { ReportCenterPage } from "../../features/reports/ReportCenterPage";
import { AnalyticsDashboardPage } from "../../features/analytics/AnalyticsDashboardPage";
import { NotificationCenterPage } from "../../features/notifications/NotificationCenterPage";
import { AuditLogPage } from "../../features/audit/AuditLogPage";
import { SettingsPage } from "../../features/settings/SettingsPage";
import { UserProfilePage } from "../../features/auth/UserProfilePage";
import { useAuth } from "../../features/auth/AuthContext";
import { hasAnyPermission } from "../../lib/permissions";
import type { Permission, Role } from "../../types";

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-accent" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <RouteLoading />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

interface PermissionGuardProps {
  children: ReactNode;
  permission: Permission | Permission[];
}

function PermissionGuard({ children, permission }: PermissionGuardProps) {
  const { user, cmsAccess } = useAuth();
  if (!user || !cmsAccess.granted) {
    return <Navigate to="/login" replace />;
  }
  const perms = Array.isArray(permission) ? permission : [permission];
  if (!hasAnyPermission(user.role as Role, perms)) {
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
        <a href="/dashboard" className="btn btn-primary">
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page-container">
      <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-lg text-gray-600 mb-6">Page not found.</p>
      <a href="/dashboard" className="btn btn-primary">
        Return to Dashboard
      </a>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
       { path: "dashboard", element: <DashboardPage /> },
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
        path: "daily-logs",
        element: (
          <PermissionGuard permission={["daily_log.view", "daily_log.view_all"]}>
            <DailyLogsDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "daily-logs/new",
        element: (
          <PermissionGuard permission="daily_log.create">
            <DailyLogsDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "daily-logs/:logId",
        element: (
          <PermissionGuard permission={["daily_log.view", "daily_log.view_all"]}>
            <DailyLogDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: "timesheets",
        element: (
          <PermissionGuard permission="timesheet.view_all">
            <TimesheetsDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "timesheets/my",
        element: (
          <PermissionGuard permission="timesheet.view">
            <MyTimesheetsPage />
          </PermissionGuard>
        ),
      },
      {
        path: "timesheets/:timesheetId",
        element: (
          <PermissionGuard permission={["timesheet.view", "timesheet.view_all"]}>
            <TimesheetDetailPage />
          </PermissionGuard>
        ),
      },
      {
        path: "invoices",
        element: (
          <PermissionGuard permission="invoice.view_all">
            <InvoicesDashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: "invoices/new",
        element: (
          <PermissionGuard permission="invoice.create">
            <InvoiceComposerPage />
          </PermissionGuard>
        ),
      },
      {
        path: "invoices/templates",
        element: (
          <PermissionGuard permission="invoice.create">
            <InvoiceTemplatesPanel />
          </PermissionGuard>
        ),
      },
      {
        path: "invoices/:invoiceId/edit",
        element: (
          <PermissionGuard permission="invoice.edit">
            <InvoiceComposerPage />
          </PermissionGuard>
        ),
      },
      {
        path: "invoices/:invoiceId",
        element: (
          <PermissionGuard permission="invoice.view_all">
            <InvoiceDetailPage />
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
        path: "reports/:reportId",
        element: (
          <PermissionGuard permission="report.view">
            <ReportCenterPage />
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
        path: "settings/:section",
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
        path: "profile/:tab",
        element: (
          <PermissionGuard permission="profile.edit">
            <UserProfilePage />
          </PermissionGuard>
        ),
      },
      { path: "403", element: <ForbiddenPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/404" replace />,
  },
]);
