import { createBrowserRouter, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { AppShell } from "../layouts/AppShell";
import { LoginPage } from "../../features/auth/LoginPage";
import { DashboardRouter } from "../../features/dashboard/DashboardRouter";
import { PlaceholderPage } from "../../components/pages/PlaceholderPage";
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
      { path: "dashboard", element: <DashboardRouter /> },
      {
        path: "clients",
        element: (
          <PermissionGuard permission="client.view">
            <PlaceholderPage title="Clients" />
          </PermissionGuard>
        ),
      },
      {
        path: "clients/:clientId",
        element: (
          <PermissionGuard permission="client.view">
            <PlaceholderPage title="Client" />
          </PermissionGuard>
        ),
      },
      {
        path: "projects",
        element: (
          <PermissionGuard permission="project.view">
            <PlaceholderPage title="Projects" />
          </PermissionGuard>
        ),
      },
      {
        path: "projects/:projectId",
        element: (
          <PermissionGuard permission="project.view">
            <PlaceholderPage title="Project" />
          </PermissionGuard>
        ),
      },
      {
        path: "projects/:projectId/edit",
        element: (
          <PermissionGuard permission="project.edit">
            <PlaceholderPage title="Edit Project" />
          </PermissionGuard>
        ),
      },
      {
        path: "assignments",
        element: (
          <PermissionGuard permission="assignment.view">
            <PlaceholderPage title="Assignments" />
          </PermissionGuard>
        ),
      },
      {
        path: "assignments/:assignmentId",
        element: (
          <PermissionGuard permission="assignment.view">
            <PlaceholderPage title="Assignment" />
          </PermissionGuard>
        ),
      },
      {
        path: "daily-logs",
        element: (
          <PermissionGuard permission={["daily_log.view", "daily_log.view_all"]}>
            <PlaceholderPage title="Daily Logs" />
          </PermissionGuard>
        ),
      },
      {
        path: "daily-logs/new",
        element: (
          <PermissionGuard permission="daily_log.create">
            <PlaceholderPage title="New Daily Log" />
          </PermissionGuard>
        ),
      },
      {
        path: "daily-logs/:logId",
        element: (
          <PermissionGuard permission={["daily_log.view", "daily_log.view_all"]}>
            <PlaceholderPage title="Daily Log" />
          </PermissionGuard>
        ),
      },
      {
        path: "daily-logs/:employeeId",
        element: (
          <PermissionGuard permission="daily_log.view_all">
            <PlaceholderPage title="Employee Daily Logs" />
          </PermissionGuard>
        ),
      },
      {
        path: "timesheets",
        element: (
          <PermissionGuard permission={["timesheet.view", "timesheet.view_all"]}>
            <PlaceholderPage title="Timesheets" />
          </PermissionGuard>
        ),
      },
      {
        path: "timesheets/my",
        element: (
          <PermissionGuard permission="timesheet.view">
            <PlaceholderPage title="My Timesheets" />
          </PermissionGuard>
        ),
      },
      {
        path: "timesheets/:timesheetId",
        element: (
          <PermissionGuard permission={["timesheet.view", "timesheet.view_all"]}>
            <PlaceholderPage title="Timesheet" />
          </PermissionGuard>
        ),
      },
      {
        path: "invoices",
        element: (
          <PermissionGuard permission={["invoice.view", "invoice.view_all"]}>
            <PlaceholderPage title="Invoices" />
          </PermissionGuard>
        ),
      },
      {
        path: "invoices/new",
        element: (
          <PermissionGuard permission="invoice.create">
            <PlaceholderPage title="New Invoice" />
          </PermissionGuard>
        ),
      },
      {
        path: "invoices/:invoiceId",
        element: (
          <PermissionGuard permission={["invoice.view", "invoice.view_all"]}>
            <PlaceholderPage title="Invoice" />
          </PermissionGuard>
        ),
      },
      {
        path: "invoices/templates",
        element: (
          <PermissionGuard permission="settings.manage">
            <PlaceholderPage title="Invoice Templates" />
          </PermissionGuard>
        ),
      },
      {
        path: "reports",
        element: (
          <PermissionGuard permission="report.view">
            <PlaceholderPage title="Reports" />
          </PermissionGuard>
        ),
      },
      {
        path: "reports/:reportId",
        element: (
          <PermissionGuard permission="report.view">
            <PlaceholderPage title="Report" />
          </PermissionGuard>
        ),
      },
      {
        path: "analytics",
        element: (
          <PermissionGuard permission="report.view">
            <PlaceholderPage title="Analytics" />
          </PermissionGuard>
        ),
      },
      {
        path: "notifications",
        element: (
          <PermissionGuard permission="notification.view">
            <PlaceholderPage title="Notifications" />
          </PermissionGuard>
        ),
      },
      {
        path: "audit-log",
        element: (
          <PermissionGuard permission="audit.view">
            <PlaceholderPage title="Audit Log" />
          </PermissionGuard>
        ),
      },
      {
        path: "settings",
        element: (
          <PermissionGuard permission="settings.manage">
            <PlaceholderPage title="Settings" />
          </PermissionGuard>
        ),
      },
      {
        path: "settings/:section",
        element: (
          <PermissionGuard permission="settings.manage">
            <PlaceholderPage title="Settings" />
          </PermissionGuard>
        ),
      },
      {
        path: "profile",
        element: (
          <PermissionGuard permission="profile.edit">
            <PlaceholderPage title="Profile" />
          </PermissionGuard>
        ),
      },
      {
        path: "profile/:tab",
        element: (
          <PermissionGuard permission="profile.edit">
            <PlaceholderPage title="Profile" />
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
