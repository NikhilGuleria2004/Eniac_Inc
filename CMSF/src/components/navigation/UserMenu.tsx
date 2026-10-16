import { useState, useRef, useEffect } from "react";
import { User as UserIcon, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";

function roleLabel(r: string): string {
  return r.charAt(0) + r.slice(1).toLowerCase();
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="User menu"
        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-gray-700"
      >
        <span className="hidden md:block text-sm font-medium">
          {user.firstName}
        </span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50" role="menu">
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{roleLabel(user.role)}</p>
          </div>

          <a
            href="/profile"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <UserIcon size={16} />
            Profile
          </a>

          <button
            onClick={() => {
              logout();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
