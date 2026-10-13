import { NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { SIDEBAR_SECTIONS } from "../../data/constants";
import { LayoutDashboard, Users, UserPlus, FileText, ClipboardCheck, Calendar, Clock, UsersRound, Briefcase, ListTodo, BarChart3, BellRing, Shield, Settings, User } from "lucide-react";
import { Drawer } from "../ui/Drawer";
import { BrandMark } from "../brand/BrandMark";

const iconMap: Record<string, React.ReactNode> = {
  Dashboard: <LayoutDashboard size={18} />,
  Employees: <Users size={18} />,
  Onboarding: <UserPlus size={18} />,
  Documents: <FileText size={18} />,
  Reviews: <ClipboardCheck size={18} />,
  Attendance: <Calendar size={18} />,
  Leave: <Clock size={18} />,
  Clients: <UsersRound size={18} />,
  Projects: <Briefcase size={18} />,
  Assignments: <ListTodo size={18} />,
  Reports: <BarChart3 size={18} />,
  Analytics: <BarChart3 size={18} />,
  Notifications: <BellRing size={18} />,
  "Audit Log": <Shield size={18} />,
  Settings: <Settings size={18} />,
  Profile: <User size={18} />,
};

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const { user } = useAuth();

  if (!user) return null;

  const sections = SIDEBAR_SECTIONS[user.role] || [];

  return (
    <Drawer open={open} onClose={onClose} side="left" title="Menu">
      <div className="flex items-center gap-2.5 px-1 pb-3 mb-1 border-b border-gray-100">
        <BrandMark size={30} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">ENIAC INC.</p>
          <p className="text-xs text-gray-500 leading-tight">Employee Management System</p>
        </div>
      </div>
      <nav className="space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.route}>
                  <NavLink
                    to={item.route}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`
                    }
                  >
                    {iconMap[item.label] || null}
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </Drawer>
  );
}
