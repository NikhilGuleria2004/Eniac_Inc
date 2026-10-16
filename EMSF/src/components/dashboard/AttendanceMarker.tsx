import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { checkIn, getAttendanceByEmployee } from "../../data/mock/repositories";
import { hasPermission } from "../../lib/permissions";

export function AttendanceMarker() {
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const employeeId = user.employeeId || user.id;
  const canMark = hasPermission(user.role, "attendance.mark");
  if (!canMark) return null;

  const attendance = useMemo(() => getAttendanceByEmployee(employeeId), [employeeId, refreshKey]);
  const todayDate = new Date().toISOString().split("T")[0];
  const today = attendance.find((a) => a.date === todayDate);
  const checkedIn = today?.checkIn !== undefined && today?.checkOut === undefined;

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Today's Attendance</h3>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold text-gray-900">
            {currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Status: <span className={`font-medium ${checkedIn || today?.status === "PRESENT" ? "text-green-600" : "text-gray-500"}`}>
              {checkedIn || today?.status === "PRESENT" ? "Checked In" : "Not Checked In"}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {!checkedIn ? (
            <button
              onClick={async () => {
                setActionLoading(true);
                await checkIn({ employeeId, checkIn: new Date().toISOString() });
                setActionLoading(false);
                setRefreshKey((n) => n + 1);
              }}
              disabled={actionLoading}
              className="btn btn-primary"
            >
              {actionLoading ? <><Loader2 aria-hidden="true" size={16} className="animate-spin" /> Checking in…</> : "Mark Attendance"}
            </button>
          ) : (
            <button disabled className="btn btn-secondary">
              Marked
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
