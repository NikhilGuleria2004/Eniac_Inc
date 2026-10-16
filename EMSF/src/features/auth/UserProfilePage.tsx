import { useMemo } from "react";
import { useAuth } from "./AuthContext";
import { getEmployeeById } from "../../data/mock/repositories";
import { EmployeeAvatar } from "../../components/data/EmployeeAvatar";
import { StatusBadge } from "../../components/data/StatusBadge";
import { PageHeader } from "../../components/layout/PageHeader";
import { Shield, User, Mail, Phone, MapPin, Calendar, Briefcase, Clock, Hash, FileText, Globe, Key, Smartphone } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  HR: "Human Resources",
  MANAGER: "Manager",
  SUPERVISOR: "Supervisor",
  EMPLOYEE: "Employee",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Full system access with administrative privileges across all modules.",
  HR: "Human Resources personnel managing employee lifecycle, onboarding, and compliance.",
  MANAGER: "Team manager with project oversight, client management, and team operations.",
  SUPERVISOR: "Direct supervisory role for operational oversight and team coordination.",
  EMPLOYEE: "Standard employee access to personal data, attendance, and leave workflows.",
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  Personal: <User aria-hidden="true" size={16} />,
  Account: <Hash aria-hidden="true" size={16} />,
  Work: <Briefcase aria-hidden="true" size={16} />,
  Dates: <Calendar aria-hidden="true" size={16} />,
  Security: <Key aria-hidden="true" size={16} />,
  System: <Shield aria-hidden="true" size={16} />,
};

export function UserProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const employee = useMemo(
    () => (user.employeeId ? getEmployeeById(user.employeeId) : undefined),
    [user.employeeId],
  );

  const fullName = `${user.firstName} ${user.lastName}`;
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;
  const roleDescription = ROLE_DESCRIPTIONS[user.role] ?? "";

  const InfoRow = ({ label, value, icon }: { label: string; value?: React.ReactNode; icon: React.ReactNode }) => (
    <div className="group">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 mt-0.5 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0">{icon}</div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
          <span className="text-sm text-gray-900 mt-0.5">
            {value ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );

  const SectionCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="card">
      <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-gray-100">
        {icon}
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-3.5">{children}</div>
    </div>
  );

  return (
    <div className="page-container max-w-5xl mx-auto">
      <PageHeader
        title={fullName}
        description={roleLabel}
        breadcrumbs={[{ label: "Profile" }]}
        actions={
          <button
            onClick={logout}
            className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        }
      />

      <div className="card mb-6 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-4 min-w-0">
            <EmployeeAvatar firstName={user.firstName} lastName={user.lastName} avatar={user.avatar} size="lg" />
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 break-words">{fullName}</h2>
              <p className="text-sm text-gray-500 mt-0.5 break-all">{user.email}</p>
              <p className="text-sm text-gray-600 mt-1">{roleDescription}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent">
                  <Shield aria-hidden="true" size={12} />
                  {roleLabel}
                </span>
                {employee && <StatusBadge status={employee.employmentStatus} />}
                {employee && <StatusBadge status={employee.billingStatus} />}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Member Since</p>
            <p className="text-lg font-medium text-gray-900 mt-1">
              {employee?.createdAt
                ? new Date(employee.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <SectionCard title="Personal Information" icon={SECTION_ICONS.Personal}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <InfoRow label="Full Name" value={`${user.firstName} ${user.lastName}`} icon={<User aria-hidden="true" />} />
          <InfoRow label="Email Address" value={user.email} icon={<Mail aria-hidden="true" />} />
          <InfoRow label="Phone Number" value={employee?.phone ?? "—"} icon={<Phone aria-hidden="true" />} />
          <InfoRow label="Location" value={employee ? `${employee.city}, ${employee.country}` : "—"} icon={<MapPin aria-hidden="true" />} />
          <InfoRow label="Designation" value={employee?.designation ?? user.designation ?? "—"} icon={<Briefcase aria-hidden="true" />} />
          <InfoRow label="Department" value={employee?.department ?? user.department ?? "—"} icon={<Briefcase aria-hidden="true" />} />
        </div>
      </SectionCard>

      <SectionCard title="Account Details" icon={SECTION_ICONS.Account}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <InfoRow label="User ID" value={user.id} icon={<Hash aria-hidden="true" />} />
          <InfoRow label="Employee ID" value={user.employeeId ?? "—"} icon={<Hash aria-hidden="true" />} />
          <InfoRow label="Employee Code" value={employee?.employeeCode ?? "—"} icon={<Hash aria-hidden="true" />} />
          <InfoRow
            label="Account Created"
            value={
              employee?.createdAt
                ? new Date(employee.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—"
            }
            icon={<Calendar aria-hidden="true" />}
          />
          <InfoRow
            label="Last Updated"
            value={
              employee?.updatedAt
                ? new Date(employee.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—"
            }
            icon={<Calendar aria-hidden="true" />}
          />
          <InfoRow label="IP Address" value={"192.168.1.1"} icon={<Smartphone aria-hidden="true" />} />
        </div>
      </SectionCard>

      {employee && (
        <SectionCard title="Employment Information" icon={SECTION_ICONS.Work}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow label="Employment Type" value={employee.employmentType} icon={<Briefcase aria-hidden="true" />} />
            <InfoRow label="Employment Status" value={<StatusBadge status={employee.employmentStatus} />} icon={<Clock aria-hidden="true" />} />
            <InfoRow label="Billing Status" value={<StatusBadge status={employee.billingStatus} />} icon={<FileText aria-hidden="true" />} />
            <InfoRow label="Timesheet Eligibility" value={<StatusBadge status={employee.timesheetEligibility} />} icon={<Clock aria-hidden="true" />} />
            {employee.compensation?.currency && (
              <>
                <InfoRow label="Currency" value={employee.compensation.currency} icon={<Globe aria-hidden="true" />} />
                <InfoRow
                  label="Annual Salary"
                  value={
                    employee.compensation.salary
                      ? `${employee.compensation.currency} ${employee.compensation.salary.toLocaleString()}`
                      : "—"
                  }
                  icon={<FileText aria-hidden="true" />}
                />
                <InfoRow label="Pay Frequency" value={employee.compensation.payFrequency ?? "—"} icon={<Clock aria-hidden="true" />} />
              </>
            )}
            {employee.managerId && <InfoRow label="Manager ID" value={employee.managerId} icon={<User aria-hidden="true" />} />}
            <InfoRow
              label="Joining Date"
              value={new Date(employee.joiningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              icon={<Calendar aria-hidden="true" />}
            />
          </div>
        </SectionCard>
      )}

      <SectionCard title="Security & System Access" icon={SECTION_ICONS.Security}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <InfoRow
            label="Role"
            value={
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent">
                <Shield aria-hidden="true" size={12} />
                {roleLabel}
              </span>
            }
            icon={<Shield aria-hidden="true" />}
          />
          <InfoRow label="Permissions Scope" value="Role-based access control (RBAC)" icon={<Key aria-hidden="true" />} />
          <InfoRow label="Two-Factor Auth" value="Enabled" icon={<Key aria-hidden="true" />} />
          <InfoRow label="Session Status" value="Active" icon={<Clock aria-hidden="true" />} />
          <div className="sm:col-span-2">
            <InfoRow
              label="Role Description"
              value={roleDescription || "No description available."}
              icon={<Shield aria-hidden="true" />}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent Activity" icon={SECTION_ICONS.System}>
        <div className="space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Last Login</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Account Active</p>
              <p className="text-xs text-gray-500 mt-0.5">Your profile and access permissions are active.</p>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
