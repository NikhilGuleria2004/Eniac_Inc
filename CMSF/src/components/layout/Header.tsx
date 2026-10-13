import { Menu, Bell, HelpCircle } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { ENV_LABEL } from "../../data/constants";
import { UserMenu } from "../../components/navigation/UserMenu";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

export function Header({ onToggleSidebar, onToggleMobileSidebar }: HeaderProps) {
  const { user } = useAuth();

  if (!user) return null;

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
        <button className="p-2 hover:bg-gray-100 rounded-md hidden sm:flex" aria-label="Notifications">
          <Bell size={20} className="text-gray-600" />
        </button>

        <button className="p-2 hover:bg-gray-100 rounded-md hidden sm:flex" aria-label="Help">
          <HelpCircle size={20} className="text-gray-600" />
        </button>

        <span className="badge badge-neutral hidden lg:inline-flex">{ENV_LABEL} ENVIRONMENT</span>

        <UserMenu />
      </div>
    </header>
  );
}
