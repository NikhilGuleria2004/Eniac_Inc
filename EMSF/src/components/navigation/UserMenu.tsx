import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { ROUTES } from "../../data/constants";
import { NavLink } from "react-router-dom";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        aria-expanded={open}
        aria-label={`Account menu for ${user.firstName} ${user.lastName}`}
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
          {user.firstName[0]}{user.lastName[0]}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-gray-900">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-gray-500">{user.role}</div>
        </div>
        <ChevronRight aria-hidden="true" size={14} className={`text-gray-400 hidden sm:block transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <NavLink
            to={ROUTES.PROFILE}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <User aria-hidden="true" size={16} />
            <span>Profile</span>
          </NavLink>
          <NavLink
            to={ROUTES.SETTINGS}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Settings aria-hidden="true" size={16} />
            <span>Settings</span>
          </NavLink>
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
            >
              <LogOut aria-hidden="true" size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
