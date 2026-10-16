import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import { getEmployees, getInvoiceTemplates } from "../../data/mock/repositories";
import { ROLE_PERMISSIONS } from "../../lib/permissions";
import { CLIENT_TIERS, PROJECT_TIERS, PAYMENT_TERMS, INDUSTRIES, COUNTRIES, ROLES } from "../../data/constants";
import { getCurrentBillingPeriod } from "../../lib/utils";
import type { Role } from "../../types";

const SECTIONS = [
  { id: "users", label: "Users" },
  { id: "roles", label: "Roles & Permissions" },
  { id: "employment-types", label: "Employment Types" },
  { id: "countries", label: "Countries" },
  { id: "departments", label: "Departments" },
  { id: "designations", label: "Designations" },
  { id: "industries", label: "Industries" },
  { id: "client-tiers", label: "Client Tiers" },
  { id: "project-tiers", label: "Project Tiers" },
  { id: "billing-periods", label: "Billing Periods" },
  { id: "payment-terms", label: "Payment Terms" },
  { id: "invoice-templates", label: "Invoice Templates" },
  { id: "notification-settings", label: "Notification Settings" },
  { id: "system-preferences", label: "System Preferences" },
];

const PAYMENT_TERM_DAYS: Record<string, number> = { NET_15: 15, NET_30: 30, NET_45: 45, NET_60: 60, CUSTOM: 0, DUE_ON_RECEIPT: 0 };

export function SettingsPage() {
  const { section } = useParams();
  const [active, setActive] = useState(section ?? "users");
  const employees = useMemo(() => getEmployees(), []);
  const templates = useMemo(() => getInvoiceTemplates(), []);
  const period = getCurrentBillingPeriod();

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department))).sort(), [employees]);
  const designations = useMemo(() => Array.from(new Set(employees.map((e) => e.designation))).sort(), [employees]);

  return (
    <div className="page-container">
      <PageHeader title="Settings" subtitle="CMS configuration" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
        <nav className="space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${active === s.id ? "bg-institutional font-medium text-gray-900" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="card">
          {active === "users" && (
            <Section title="Users" subtitle={`${employees.length} employees in the organization`}>
              <SimpleTable headers={["Employee", "Code", "Role", "Status"]} rows={employees.slice(0, 30).map((e) => [`${e.firstName} ${e.lastName}`, e.employeeCode, e.role, e.employmentStatus])} />
            </Section>
          )}

          {active === "roles" && (
            <Section title="Roles & Permissions" subtitle="CMS permission matrix by role">
              <div className="space-y-4">
                {ROLES.map((role) => (
                  <div key={role}>
                    <p className="text-sm font-semibold text-gray-900">{role}{role === "HR" && <span className="ml-2 text-xs text-danger">(no CMS access)</span>}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ROLE_PERMISSIONS[role as Role].length === 0
                        ? <span className="text-xs text-gray-400">No permissions</span>
                        : ROLE_PERMISSIONS[role as Role].map((p) => <span key={p} className="badge badge-neutral">{p}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {active === "employment-types" && (
            <Section title="Employment Types" subtitle="Managed in the Employee Management System">
              <ListItems items={["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]} />
            </Section>
          )}

          {active === "countries" && (
            <Section title="Countries" subtitle="Supported operating countries">
              <ListItems items={[...COUNTRIES]} />
            </Section>
          )}

          {active === "departments" && (
            <Section title="Departments" subtitle={`${departments.length} departments`}>
              <ListItems items={departments} />
            </Section>
          )}

          {active === "designations" && (
            <Section title="Designations" subtitle={`${designations.length} designations`}>
              <ListItems items={designations} />
            </Section>
          )}

          {active === "industries" && (
            <Section title="Industries" subtitle="Client industry categories">
              <ListItems items={[...INDUSTRIES]} />
            </Section>
          )}

          {active === "client-tiers" && (
            <Section title="Client Tiers" subtitle="Client segmentation tiers">
              <ListItems items={[...CLIENT_TIERS]} />
            </Section>
          )}

          {active === "project-tiers" && (
            <Section title="Project Tiers" subtitle="Project size tiers">
              <ListItems items={[...PROJECT_TIERS]} />
            </Section>
          )}

          {active === "billing-periods" && (
            <Section title="Billing Periods" subtitle="Bi-monthly timesheet periods">
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Period Type</dt><dd className="text-gray-900">Bi-monthly (1st–15th / 16th–month end)</dd>
                <dt className="text-gray-500">First Period Start</dt><dd className="text-gray-900">1st of the month</dd>
                <dt className="text-gray-500">Second Period Start</dt><dd className="text-gray-900">16th of the month</dd>
                <dt className="text-gray-500">Current Period</dt><dd className="text-gray-900">{period.label}</dd>
              </dl>
            </Section>
          )}

          {active === "payment-terms" && (
            <Section title="Payment Terms" subtitle="Invoice payment terms">
              <SimpleTable headers={["Name", "Days", "Default"]} rows={PAYMENT_TERMS.map((t) => [t.replace(/_/g, " "), String(PAYMENT_TERM_DAYS[t] ?? 0), t === "NET_30" ? "Yes" : ""])} />
            </Section>
          )}

          {active === "invoice-templates" && (
            <Section title="Invoice Templates" subtitle="Configured templates">
              <p className="mb-3 text-sm text-gray-600">Full template editor (colors, T&C, tax) is available at <span className="font-medium text-accent">/invoices/templates</span>.</p>
              <SimpleTable headers={["Name", "Primary Color", "Default"]} rows={templates.map((t) => [t.name, t.primaryColor, t.isDefault ? "Yes" : ""])} />
            </Section>
          )}

          {active === "notification-settings" && (
            <Section title="Notification Settings" subtitle="Default notification routing">
              <ListItems items={["Timesheet due reminders", "Timesheet submitted (approvers)", "Invoice sent", "Invoice paid", "New client / project"]} />
            </Section>
          )}

          {active === "system-preferences" && (
            <Section title="System Preferences" subtitle="Global CMS preferences">
              <SimpleTable headers={["Preference", "Value"]} rows={[["Period Type", "BI_MONTHLY"], ["Display Mode", "Light only (v1)"], ["Timesheet Eligibility Rule", "ACTIVE + BILLABLE + onboarding complete"]]} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="mb-3 text-xs text-gray-500">{subtitle}</p>}
      {children}
    </div>
  );
}

function ListItems({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((i) => <li key={i} className="badge badge-neutral">{i.replace(/_/g, " ")}</li>)}
    </ul>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: (string)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-200 text-left text-gray-600">{headers.map((h) => <th key={h} className="py-2 px-3">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100">
              {row.map((cell, j) => <td key={j} className="py-2 px-3 text-gray-900">{cell || "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
