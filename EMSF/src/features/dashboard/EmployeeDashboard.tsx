import { useState, useEffect, useMemo } from "react";
import { Clock, Calendar, FolderOpen, FileText, Loader2 } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { checkIn, getAttendanceByEmployee, getLeaveRequestsByEmployee, getAssignmentsByEmployee, getDocumentsByEmployee, getNotificationsByUser, getProjects, getClients } from "../../data/mock/repositories";
import { LEAVE_QUOTAS, type LeaveType } from "../../features/leave/leave";

export function EmployeeDashboard() {
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const employeeId = user.employeeId || user.id;
  const attendance = useMemo(() => getAttendanceByEmployee(employeeId), [employeeId, refreshKey]);
  const todayDate = new Date().toISOString().split("T")[0];
  const today = attendance.find((a) => a.date === todayDate);
  const checkedIn = today?.checkIn !== undefined;
  const leaveRequests = getLeaveRequestsByEmployee(employeeId);
  const assignments = getAssignmentsByEmployee(employeeId);
  const documents = getDocumentsByEmployee(employeeId);
  const notifications = getNotificationsByUser(user.id);
  const projects = getProjects();
  const clients = getClients();

  const pendingLeaves = leaveRequests.filter((l) => l.status === "PENDING").length;
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  // Leave balance by type — calculated from actual approved leave requests
  const leaveBalance = useMemo(() => {
    const approved = leaveRequests.filter((l) => l.status === "APPROVED");
    const balances: Record<LeaveType, { total: number; used: number; remaining: number }> = {} as Record<LeaveType, { total: number; used: number; remaining: number }>;
    for (const type of Object.keys(LEAVE_QUOTAS) as LeaveType[]) {
      const used = approved.filter((l) => l.type === type).reduce((s, l) => s + l.days, 0);
      const total = LEAVE_QUOTAS[type];
      balances[type] = { total, used, remaining: Math.max(total - used, 0) };
    }
    return balances;
  }, [leaveRequests]);

  // Get project details for assignments
  const projectsWithDetails = assignments.map((asgn) => {
    const project = projects.find((p) => p.id === asgn.projectId);
    const client = project ? clients.find((c) => c.id === project.clientId) : null;
    return {
      ...asgn,
      projectName: project?.name || "Unknown",
      clientName: client?.name || "Unknown",
      projectStatus: project?.status || "UNKNOWN",
      projectHealth: project?.health || "UNKNOWN",
    };
  });

  // Recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5);

  // Attendance for current week (last 5 working days)
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const todayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentWeekAttendance = weekDays.map((day, index) => {
    // Calculate date for this weekday
    const dayOffset = index + 1 - todayIndex; // Adjust for Monday=1
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const dateStr = date.toISOString().split("T")[0];
    const record = attendance.find((a) => a.date === dateStr);
    return { day, record };
  });

  return (
     <div className="page-container space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Employee Self-Service Portal</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user.firstName} {user.lastName}</p>
      </div>

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
                  <button onClick={async () => { setActionLoading(true); await checkIn({ employeeId, checkIn: new Date().toISOString() }); setActionLoading(false); setRefreshKey((n) => n + 1); }} disabled={actionLoading} className="btn btn-primary">
                    {actionLoading ? <><Loader2 size={16} className="animate-spin" /> Checking in...</> : "Mark Attendance"}
                  </button>
                ) : (
                  <button disabled className="btn btn-secondary">
                    Marked
                  </button>
                )}
              </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Leave Balance" value={`${leaveBalance.PAID.remaining + leaveBalance.SICK.remaining + leaveBalance.CASUAL.remaining} days`} icon={<Clock size={20} />} />
        <StatCard label="Pending Requests" value={pendingLeaves.toString()} icon={<Calendar size={20} />} />
        <StatCard label="Assigned Projects" value={assignments.length.toString()} icon={<FolderOpen size={20} />} />
        <StatCard label="Documents" value={documents.length.toString()} icon={<FileText size={20} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">My Attendance</h3>
          <div className="space-y-2">
            {currentWeekAttendance.map(({ day, record }) => (
              <div key={day} className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-600">{day}</span>
                <span className={`text-sm font-medium ${record?.status === "PRESENT" ? "text-green-600" : record?.status === "LATE" ? "text-yellow-600" : record?.status === "LEAVE" ? "text-blue-600" : record?.status === "ABSENT" ? "text-red-600" : "text-gray-400"}`}>
                  {record?.status || (record ? "Present" : "—")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Leave Balance</h3>
          <div className="space-y-3">
            {[
              { type: "Paid Leave", key: "PAID", icon: <Calendar size={16} /> },
              { type: "Sick Leave", key: "SICK", icon: <Clock size={16} /> },
              { type: "Casual Leave", key: "CASUAL", icon: <FileText size={16} /> },
            ].map(({ type, key, icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-sm text-gray-600">{type}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{leaveBalance[key as keyof typeof leaveBalance].remaining} / {leaveBalance[key as keyof typeof leaveBalance].total} days</p>
                  <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(leaveBalance[key as keyof typeof leaveBalance].remaining / leaveBalance[key as keyof typeof leaveBalance].total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">My Projects</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Project</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Client</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Role</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Allocation</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {projectsWithDetails.length > 0 ? (
                  projectsWithDetails.map((proj) => (
                    <tr key={proj.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">{proj.projectName}</td>
                      <td className="py-2 px-3 text-gray-600">{proj.clientName}</td>
                      <td className="py-2 px-3 text-gray-600">{proj.role}</td>
                      <td className="py-2 px-3 text-gray-600">{proj.allocation}%</td>
                      <td className="py-2 px-3">
                        <span className={`badge ${proj.projectHealth === "ON_TRACK" ? "badge-success" : proj.projectHealth === "AT_RISK" ? "badge-warning" : proj.projectHealth === "DELAYED" ? "badge-danger" : "badge-neutral"}`}>
                          {proj.projectHealth}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">No assigned projects</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">My Documents</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Document</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Type</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Uploaded</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {documents.length > 0 ? (
                  documents.slice(0, 5).map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-900">{doc.name}</td>
                      <td className="py-2 px-3 text-gray-600">{doc.type}</td>
                      <td className="py-2 px-3 text-gray-600">{new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                      <td className="py-2 px-3">
                        <span className={`badge ${doc.status === "APPROVED" ? "badge-success" : doc.status === "PENDING" ? "badge-warning" : doc.status === "UNDER_REVIEW" ? "badge-info" : doc.status === "REJECTED" ? "badge-danger" : "badge-neutral"}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-600">{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">No documents</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          {unreadNotifications > 0 && (
            <span className="badge badge-warning">{unreadNotifications} unread</span>
          )}
        </div>
        <div className="space-y-3">
          {recentNotifications.length > 0 ? (
            recentNotifications.map((notif) => (
              <div key={notif.id} className={`flex items-start gap-3 p-3 rounded-md ${!notif.read ? "bg-blue-50" : "bg-gray-50"}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 ${notif.type === "LEAVE" ? "bg-blue-500" : notif.type === "DOCUMENT" ? "bg-green-500" : notif.type === "PROJECT" ? "bg-purple-500" : notif.type === "ATTENDANCE" ? "bg-orange-500" : "bg-gray-500"}`} />
                <div className="flex-1">
                  <p className={`text-sm ${!notif.read ? "font-semibold" : "font-normal"} text-gray-900`}>{notif.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    at {new Date(notif.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">No notifications</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  );
}
