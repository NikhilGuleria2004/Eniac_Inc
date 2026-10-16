import { useParams } from "react-router-dom";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { PageHeader } from "../../components/layout/PageHeader";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";

const TABS = ["Profile", "Security", "Notifications", "CMS Preferences"] as const;

export function UserProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { tab } = useParams();
  const [active, setActive] = useState(tab ?? "profile");

  const [dailyLogReminders, setDailyLogReminders] = useState(true);
  const [timesheetDue, setTimesheetDue] = useState(true);
  const [invoiceSent, setInvoiceSent] = useState(false);
  const [defaultView, setDefaultView] = useState("dashboard");
  const [periodDefault, setPeriodDefault] = useState("current");

  const email = user?.email ?? "";

  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm">
      <span className="text-gray-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
    </label>
  );

  return (
    <div className="page-container space-y-6">
      <PageHeader title="My Profile" subtitle="Account, security, notifications and CMS preferences" />

      <Tabs defaultValue="profile" value={active} onValueChange={setActive}>
        <TabsList>
          {TABS.map((t) => <TabsTrigger key={t} value={t.toLowerCase().replace(" ", "-")}>{t}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="profile" className="pt-6">
          <div className="card max-w-xl">
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-gray-500">Name</dt><dd className="text-gray-900">{user?.firstName} {user?.lastName}</dd>
              <dt className="text-gray-500">Email</dt><dd className="text-gray-900">{email}</dd>
              <dt className="text-gray-500">Role</dt><dd className="text-gray-900">{user?.role}</dd>
              <dt className="text-gray-500">Employee ID</dt><dd className="text-gray-900">{user?.employeeId ?? "—"}</dd>
              <dt className="text-gray-500">Billing Status</dt><dd className="text-gray-900">{user?.billingStatus ?? "—"}</dd>
            </dl>
            <p className="mt-4 text-xs text-gray-500">Profile fields (name, email, phone, avatar) are edited in the Employee Management System.</p>
          </div>
        </TabsContent>

        <TabsContent value="security" className="pt-6">
          <div className="card max-w-xl space-y-4">
            <div><label className="form-label">Current Password</label><Input type="password" placeholder="••••••••" /></div>
            <div><label className="form-label">New Password</label><Input type="password" /></div>
            <div><label className="form-label">Confirm New Password</label><Input type="password" /></div>
            <button className="btn btn-primary" onClick={() => addToast("success", "Password updated (simulated)")}>Update Password</button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="pt-6">
          <div className="card max-w-xl space-y-2">
            <Toggle label="Daily log reminders" checked={dailyLogReminders} onChange={setDailyLogReminders} />
            <Toggle label="Timesheet due" checked={timesheetDue} onChange={setTimesheetDue} />
            <Toggle label="Invoice sent" checked={invoiceSent} onChange={setInvoiceSent} />
            <button className="btn btn-primary mt-2" onClick={() => addToast("success", "Notification preferences saved")}>Save Preferences</button>
          </div>
        </TabsContent>

        <TabsContent value="cms-preferences" className="pt-6">
          <div className="card max-w-xl space-y-4">
            <div>
              <label className="form-label">Default Dashboard View</label>
              <Select value={defaultView} onChange={(e) => setDefaultView(e.target.value)}>
                <option value="dashboard">Dashboard</option>
                <option value="timesheets">Timesheets</option>
                <option value="daily-logs">Daily Logs</option>
                <option value="invoices">Invoices</option>
              </Select>
            </div>
            <div>
              <label className="form-label">Timesheet Period Default</label>
              <Select value={periodDefault} onChange={(e) => setPeriodDefault(e.target.value)}>
                <option value="current">Current period</option>
                <option value="previous">Previous period</option>
              </Select>
            </div>
            <div className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-500">
              Display Mode: Light only (no dark mode in v1)
            </div>
            <button className="btn btn-primary" onClick={() => addToast("success", "CMS preferences saved")}>Save Preferences</button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
