import { useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router-dom";
import { Header } from "../../components/layout/Header";
import { Sidebar } from "../../components/layout/Sidebar";
import { MobileSidebar } from "../../components/navigation/MobileSidebar";
import { Footer } from "../../components/layout/Footer";
import { useAuth } from "../../features/auth/AuthContext";
import { ToastProvider } from "../../components/ui/Toast";
import { titleForPath, usePageTitle } from "../router/usePageTitle";

export function AppShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  usePageTitle(titleForPath(pathname));

  if (!user) {
    return (
      <>
        <ScrollRestoration />
        <Outlet />
      </>
    );
  }

  return (
    <ToastProvider>
      <ScrollRestoration />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Header
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />
        <Sidebar collapsed={sidebarCollapsed} />
        <MobileSidebar open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
        <main id="main-content" tabIndex={-1} className="app-main">
          <Outlet />
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}
