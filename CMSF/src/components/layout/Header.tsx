import { Menu, Bell, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { ENV_LABEL, ROUTES } from "../../data/constants";
import { getNotifications } from "../../data/mock/repositories";
import { useToast } from "../../components/ui/Toast";
import { ThemeToggle } from "../../components/navigation/ThemeToggle";
import { UserMenu } from "../../components/navigation/UserMenu";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

export function Header({ onToggleSidebar, onToggleMobileSidebar }: HeaderProps) {
  const { user } = useAuth();
  const { addToast } = useToast();

  if (!user) return null;

  const notifications =
    user.role === "EMPLOYEE"
      ? getNotifications().filter((n) => n.userId === user.employeeId)
      : getNotifications();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="app-header">
      <button
        onClick={onToggleMobileSidebar}
        className="p-2 hover:bg-gray-100 rounded-md lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <button
        onClick={onToggleSidebar}
        className="p-2 hover:bg-gray-100 rounded-md hidden lg:inline-flex"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <span className="text-lg font-semibold text-gray-900 hidden lg:inline">
        Client Management System
      </span>

      <div className="flex items-center gap-1 ml-auto">
        <Link
          to={ROUTES.NOTIFICATIONS}
          className="relative p-2 hover:bg-gray-100 rounded-md hidden sm:inline-flex"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        >
          <Bell size={20} className="text-gray-600" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>

        <button
          className="p-2 hover:bg-gray-100 rounded-md hidden sm:flex"
          aria-label="Help"
          onClick={() => addToast("info", "Help & documentation (simulated in this shell)")}
        >
          <HelpCircle size={20} className="text-gray-600" />
        </button>

        <span className="badge badge-neutral hidden lg:inline-flex">{ENV_LABEL} ENVIRONMENT</span>

        <ThemeToggle />

        <UserMenu />
      </div>
    </header>
  );
}
