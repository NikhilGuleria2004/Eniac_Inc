import { HelpCircle, Menu } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { ENV_LABEL } from "../../data/constants";
import { SearchBar } from "../../components/navigation/SearchBar";
import { NotificationsDropdown } from "../../components/navigation/NotificationsDropdown";
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
        className="p-2 hover:bg-gray-100 rounded-md lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <div className="hidden md:block w-full max-w-xl">
        <SearchBar />
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <button className="p-2 hover:bg-gray-100 rounded-md md:hidden" aria-label="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>

        <span className="badge badge-neutral hidden lg:inline-flex">{ENV_LABEL} ENVIRONMENT</span>

        <NotificationsDropdown />

        <button className="p-2 hover:bg-gray-100 rounded-md hidden sm:flex" aria-label="Help">
          <HelpCircle size={20} className="text-gray-600" />
        </button>

        <UserMenu />
      </div>
    </header>
  );
}
