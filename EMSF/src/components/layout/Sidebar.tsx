import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, UserPlus, FileText, ClipboardCheck, Calendar, Clock, UsersRound, Briefcase, ListTodo, BarChart3, BellRing, Shield, Settings, User } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { SIDEBAR_SECTIONS } from "../../data/constants";
import { BrandMark } from "../brand/BrandMark";

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard aria-hidden="true" size={18} />,
  Employees: <Users aria-hidden="true" size={18} />,
  Onboarding: <UserPlus aria-hidden="true" size={18} />,
  Documents: <FileText aria-hidden="true" size={18} />,
  Reviews: <ClipboardCheck aria-hidden="true" size={18} />,
  Attendance: <Calendar aria-hidden="true" size={18} />,
  Leave: <Clock aria-hidden="true" size={18} />,
  Clients: <UsersRound aria-hidden="true" size={18} />,
  Projects: <Briefcase aria-hidden="true" size={18} />,
  Assignments: <ListTodo aria-hidden="true" size={18} />,
  Reports: <BarChart3 aria-hidden="true" size={18} />,
  Analytics: <BarChart3 aria-hidden="true" size={18} />,
  Notifications: <BellRing aria-hidden="true" size={18} />,
  "Audit Log": <Shield aria-hidden="true" size={18} />,
  Settings: <Settings aria-hidden="true" size={18} />,
  Profile: <User aria-hidden="true" size={18} />,
};

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user } = useAuth();

  if (!user) return null;

  const sections = SIDEBAR_SECTIONS[user.role] || [];

  return (
    <aside className={`app-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-white/10 ${collapsed ? "justify-center px-2" : ""}`}>
        <BrandMark size={collapsed ? 32 : 36} variant="on-dark" />
        <div className="flex flex-col min-w-0">
          {!collapsed && (
            <>
              <span className="text-sm font-bold text-white leading-tight" translate="no">ENIAC INC.</span>
              <span className="text-xs text-sidebar-text opacity-70 leading-tight">Employee Management System</span>
            </>
          )}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
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
              {section.items.map((item) => {
                return (
                  <li key={item.route}>
                    <NavLink
                      to={item.route}
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
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
