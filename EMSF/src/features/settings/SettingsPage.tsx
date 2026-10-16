import { Shield, Tag, Calendar, FileText, Briefcase, MapPin, Building2, Bell, Settings, Plus, Edit2, Trash2, Save } from "lucide-react";
import { useState, useMemo } from "react";
import { ROLE_PERMISSIONS, DEPARTMENTS, DESIGNATIONS, EMPLOYMENT_TYPES, LEAVE_TYPES, COUNTRIES, ROLES, ENV_LABEL } from "../../data/constants";

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "users", label: "Users", icon: <Shield aria-hidden="true" size={18} />, title: "Role & Permissions", description: "Configure role-based access control" },
  { id: "leave-types", label: "Leave Types", icon: <Calendar aria-hidden="true" size={18} />, title: "Leave Types", description: "Configure available leave types" },
  { id: "document-types", label: "Document Types", icon: <FileText aria-hidden="true" size={18} />, title: "Document Types", description: "Configure document type classifications" },
  { id: "employment-types", label: "Employment Types", icon: <Briefcase aria-hidden="true" size={18} />, title: "Employment Types", description: "Configure employment type options" },
  { id: "countries", label: "Countries", icon: <MapPin aria-hidden="true" size={18} />, title: "Countries", description: "Configure supported countries and regions" },
  { id: "departments", label: "Departments", icon: <Building2 aria-hidden="true" size={18} />, title: "Departments", description: "Configure organizational departments" },
  { id: "designations", label: "Designations", icon: <Tag aria-hidden="true" size={18} />, title: "Designations", description: "Configure job designations" },
  { id: "notifications", label: "Notifications", icon: <Bell aria-hidden="true" size={18} />, title: "Notification Settings", description: "Configure notification preferences" },
  { id: "system", label: "System Preferences", icon: <Settings aria-hidden="true" size={18} />, title: "System Preferences", description: "Global system configuration" },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState("users");

  const activeSectionData = useMemo(() => SETTINGS_SECTIONS.find((s) => s.id === activeSection), [activeSection]);

  return (
     <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Admin-only configuration panel</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
          <Shield aria-hidden="true" size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600">Admin Only</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="w-full lg:w-64 shrink-0">
          <div className="card p-2 flex lg:block gap-1 overflow-x-auto tabs-scroll">
            {SETTINGS_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors shrink-0 lg:w-full ${
                  activeSection === section.id
                    ? "bg-accent-light text-accent font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {section.icon}
                {section.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="flex-1 min-w-0">
          {activeSectionData && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                {activeSectionData.icon}
                <h2 className="text-lg font-semibold text-gray-900">{activeSectionData.title}</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">{activeSectionData.description}</p>
              {renderSectionContent(activeSection)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function renderSectionContent(sectionId: string): React.ReactNode {
  switch (sectionId) {
    case "users":
      return <RolesSection />;
    case "leave-types":
      return <ListSection title="Leave Types" items={LEAVE_TYPES} addLabel="Add Leave Type" />;
    case "document-types":
      return <DocumentTypesSection />;
    case "employment-types":
      return <ListSection title="Employment Types" items={[...EMPLOYMENT_TYPES]} addLabel="Add Employment Type" />;
    case "countries":
      return <CountriesSection />;
    case "departments":
      return <ListSection title="Departments" items={[...DEPARTMENTS]} addLabel="Add Department" />;
    case "designations":
      return <ListSection title="Designations" items={[...DESIGNATIONS]} addLabel="Add Designation" />;
    case "notifications":
      return <NotificationSettingsSection />;
    case "system":
      return <SystemPreferencesSection />;
    default:
      return <p className="text-sm text-gray-500">Section not configured.</p>;
  }
}

function RolesSection() {
  return (
    <div className="space-y-4">
      {ROLES.map((role) => (
        <div key={role} className="border border-gray-200 rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">{role}</h3>
            <span className="text-xs text-gray-500">{ROLE_PERMISSIONS[role].length} permissions</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {ROLE_PERMISSIONS[role].map((perm) => (
              <span key={perm} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-800 rounded">{perm}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocumentTypesSection() {
  const docTypes = ["RESUME", "OFFER_LETTER", "EMPLOYMENT_AGREEMENT", "ID_PROOF", "ADDRESS_PROOF", "TAX_DOCUMENT", "BANK_DOCUMENT", "CERTIFICATE", "NDA", "OTHER"];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Document Types</h3>
        <button className="btn btn-primary btn-sm">
          <Plus aria-hidden="true" size={14} className="mr-1" />
          Add Type
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {docTypes.map((t) => (
          <div key={t} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <span className="text-sm font-medium text-gray-900">{t.replace(/_/g, " ")}</span>
            <div className="flex gap-1">
              <button className="text-gray-400 hover:text-gray-600" aria-label={`Edit ${t.replace(/_/g, " ")}`}><Edit2 aria-hidden="true" size={14} /></button>
              <button className="text-gray-400 hover:text-red-500" aria-label={`Delete ${t.replace(/_/g, " ")}`}><Trash2 aria-hidden="true" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CountriesSection() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">Supported Countries</h3>
        <button className="btn btn-primary btn-sm">
          <Plus aria-hidden="true" size={14} className="mr-1" />
          Add Country
        </button>
      </div>
      <div className="space-y-2">
        {COUNTRIES.map((c) => (
          <div key={c} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <span className="text-sm font-medium text-gray-900">{c}</span>
            <div className="flex gap-1">
              <button className="text-gray-400 hover:text-gray-600" aria-label={`Edit ${c}`}><Edit2 aria-hidden="true" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationSettingsSection() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Notification Channels</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <span className="text-sm font-medium text-gray-900">Email Notifications</span>
            <p className="text-xs text-gray-500">Send email for critical system events</p>
          </div>
          <label className="relative inline-flex h-5 w-9 items-center rounded-full bg-accent">
            <input type="checkbox" className="sr-only" defaultChecked />
            <span className="absolute inset-0 rounded-full" />
          </label>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <span className="text-sm font-medium text-gray-900">In-App Notifications</span>
            <p className="text-xs text-gray-500">Show notifications in the notification center</p>
          </div>
          <label className="relative inline-flex h-5 w-9 items-center rounded-full bg-accent">
            <input type="checkbox" className="sr-only" defaultChecked />
          </label>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm font-medium text-gray-900">Leave Request Emails</span>
            <p className="text-xs text-gray-500">Email approvers on new leave requests</p>
          </div>
          <label className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-300">
            <input type="checkbox" className="sr-only" />
          </label>
        </div>
      </div>
    </div>
  );
}

function SystemPreferencesSection() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <span className="text-sm font-medium text-gray-900">Environment</span>
            <p className="text-xs text-gray-500">Current deployment environment</p>
          </div>
          <span className="text-sm font-medium text-gray-900">{ENV_LABEL}</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <span className="text-sm font-medium text-gray-900">Auto-Refresh Mock Data</span>
            <p className="text-xs text-gray-500">Reload mock data on page refresh</p>
          </div>
          <label className="relative inline-flex h-5 w-9 items-center rounded-full bg-accent">
            <input type="checkbox" className="sr-only" defaultChecked />
          </label>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <span className="text-sm font-medium text-gray-900">Audit Logging</span>
            <p className="text-xs text-gray-500">Record all admin actions</p>
          </div>
          <label className="relative inline-flex h-5 w-9 items-center rounded-full bg-accent">
            <input type="checkbox" className="sr-only" defaultChecked />
          </label>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <span className="text-sm font-medium text-gray-900">Role-Based Access Control</span>
            <p className="text-xs text-gray-500">Enforce permissions across all routes</p>
          </div>
          <label className="relative inline-flex h-5 w-9 items-center rounded-full bg-accent">
            <input type="checkbox" className="sr-only" defaultChecked />
          </label>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm font-medium text-gray-900">Sensitive Data Protection</span>
            <p className="text-xs text-gray-500">Hide salary and bill rates from unauthorized roles</p>
          </div>
          <label className="relative inline-flex h-5 w-9 items-center rounded-full bg-accent">
            <input type="checkbox" className="sr-only" defaultChecked />
          </label>
        </div>
      </div>
      <div className="pt-4 border-t border-gray-200">
        <button className="btn btn-primary">
          <Save aria-hidden="true" size={16} className="mr-2" />
          Save Preferences
        </button>
      </div>
    </div>
  );
}

function ListSection({ title, items, addLabel }: { title: string; items: readonly string[]; addLabel: string }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <button className="btn btn-primary btn-sm">
          <Plus aria-hidden="true" size={14} className="mr-1" />
          {addLabel}
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
            <span className="text-sm font-medium text-gray-900">{item}</span>
            <div className="flex gap-1">
              <button className="text-gray-400 hover:text-gray-600" aria-label={`Edit ${item}`}><Edit2 aria-hidden="true" size={14} /></button>
              <button className="text-gray-400 hover:text-red-500" aria-label={`Delete ${item}`}><Trash2 aria-hidden="true" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
