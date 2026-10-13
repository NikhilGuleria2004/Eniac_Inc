import { HelpCircle, Menu } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { ENV_LABEL } from "../../data/constants";
import { SearchBar } from "../../components/navigation/SearchBar";
import { NotificationsDropdown } from "../../components/navigation/NotificationsDropdown";
import { ThemeToggle } from "../../components/navigation/ThemeToggle";
import { UserMenu } from "../../components/navigation/UserMenu";

interface HeaderProps {
  onToggleSidebar: () => void;
  onToggleMobileSidebar: () => void;
}

export function Header({ onToggleMobileSidebar }: HeaderProps) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="app-header">
      <button
        onClick={onToggleMobileSidebar}
        className="p-2 hover:bg-gray-100 rounded-md lg:hidden shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <div className="hidden md:block w-full max-w-xl min-w-0">
        <SearchBar />
      </div>

      <div className="flex items-center gap-1 ml-auto min-w-0">
        <span className="badge badge-neutral hidden lg:inline-flex shrink-0">{ENV_LABEL} ENVIRONMENT</span>

        <ThemeToggle />

        <NotificationsDropdown />

        <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md hidden sm:flex shrink-0" aria-label="Help">
          <HelpCircle size={20} className="text-gray-600 dark:text-gray-300" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
