import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { getNotificationsByUser } from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { NavLink } from "react-router-dom";

export function NotificationsDropdown() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = user ? getNotificationsByUser(user.id) : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-gray-100 rounded-md relative"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-[calc(100vw-2rem)] max-w-96 max-h-[480px] overflow-hidden bg-white rounded-md shadow-lg border border-gray-200 z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <button className="text-xs text-accent hover:underline">Mark all as read</button>
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${!notification.read ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!notification.read ? "bg-accent" : "bg-gray-300"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{notification.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-2 border-t border-gray-100">
            <NavLink
              to={ROUTES.NOTIFICATIONS}
              onClick={() => setOpen(false)}
              className="block text-center text-sm text-accent hover:underline"
            >
              View all notifications
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
}
