import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../../components/layout/Header";
import { Sidebar } from "../../components/layout/Sidebar";
import { MobileSidebar } from "../../components/navigation/MobileSidebar";
import { Footer } from "../../components/layout/Footer";
import { useAuth } from "../../features/auth/AuthContext";
import { ToastProvider } from "../../components/ui/Toast";

export function AppShell() {
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!user) {
    return <Outlet />;
  }

  return (
    <ToastProvider>
      <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Header
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />
        <Sidebar collapsed={sidebarCollapsed} />
        <MobileSidebar open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />
        <main className="app-main">
          <Outlet />
        </main>
        <Footer />
      </div>
    </ToastProvider>
  );
}
