import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UsersRound,
  Briefcase,
  ListTodo,
  Calendar,
  Clock,
  FileText,
  BarChart3,
  BellRing,
  Shield,
  Settings,
  User,
} from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { SIDEBAR_SECTIONS, ENV_LABEL } from "../../data/constants";

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard size={18} />,
  Clients: <UsersRound size={18} />,
  Projects: <Briefcase size={18} />,
  Assignments: <ListTodo size={18} />,
  "Daily Logs": <Calendar size={18} />,
  Timesheets: <Clock size={18} />,
  "My Timesheets": <Clock size={18} />,
  Invoices: <FileText size={18} />,
  "Invoice Templates": <Settings size={18} />,
  Reports: <BarChart3 size={18} />,
  Analytics: <BarChart3 size={18} />,
  Notifications: <BellRing size={18} />,
  "Audit Log": <Shield size={18} />,
  Settings: <Settings size={18} />,
  Profile: <User size={18} />,
};

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onNavigate }: SidebarProps) {
  const { user } = useAuth();

  if (!user) return null;

  const sections = SIDEBAR_SECTIONS[user.role] || [];

  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div
        className={`flex items-center gap-3 px-4 py-4 border-b border-white/10 ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        <div className="flex flex-col">
          {!collapsed && (
            <>
              <span className="text-sm font-bold text-white leading-tight">ENIAC INC.</span>
              <span className="text-xs text-sidebar-text opacity-70 leading-tight">
                Client Management System
              </span>
            </>
          )}
        </div>
      </div>
      <nav className="sidebar-nav flex-1 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-text opacity-70">
                  {section.label}
                </span>
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.route}>
                  <NavLink
                    to={item.route}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-sidebar-active-bg text-sidebar-active border-l-2 border-accent-light"
                          : "text-sidebar-text hover:text-white hover:bg-white/5"
                      } ${collapsed ? "justify-center px-2" : ""}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    {iconMap[item.label] || null}
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-3">
        <div
          className={`flex items-center gap-3 text-sidebar-text ${collapsed ? "justify-center" : ""}`}
        >
          {!collapsed && (
            <>
              <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
              <span className="text-sm truncate">
                {user.firstName} {user.lastName}
              </span>
            </>
          )}
        </div>
        <div className={`mt-3 ${collapsed ? "flex justify-center" : ""}`}>
          <span className="badge badge-neutral text-xs">{ENV_LABEL} ENV</span>
        </div>
      </div>
    </aside>
  );
}
