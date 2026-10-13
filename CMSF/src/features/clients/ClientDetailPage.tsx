import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Building2, Mail, Phone, MapPin, Pencil, FolderPlus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { Progress } from "../../components/ui/Progress";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { ClientFormModal } from "./ClientFormModal";
import { useToast } from "../../components/ui/Toast";
import {
  getClientById,
  getProjectsByClient,
  getInvoicesByClient,
  getTimesheets,
  getAuditLogs,
  updateClient,
} from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { formatCurrency } from "../../lib/charts";
import { getCurrentBillingPeriod } from "../../lib/utils";
import type { Client } from "../../types";

export function ClientDetailPage() {
  const { clientId = "" } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const period = getCurrentBillingPeriod();

  const client = getClientById(clientId);
  const projects = useMemo(() => getProjectsByClient(clientId), [clientId]);
  const invoices = useMemo(() => getInvoicesByClient(clientId), [clientId]);
  const timesheets = useMemo(() => {
    const projectIds = new Set(projects.map((p) => p.id));
    return getTimesheets().filter((t) => t.projectBreakdown.some((pb) => projectIds.has(pb.projectId)));
  }, [projects]);
  const auditLogs = useMemo(() => getAuditLogs(), []);

  if (!client) {
    return (
      <div className="page-container">
        <p className="text-sm text-gray-500">Client not found.</p>
        <button className="btn btn-secondary mt-4" onClick={() => navigate(ROUTES.CLIENTS)}>Back to Clients</button>
      </div>
    );
  }

  const myInvoices = invoices;
  const totalInvoiced = myInvoices.filter((i) => i.status !== "VOID" && i.status !== "CANCELLED" && i.status !== "DRAFT").reduce((s, i) => s + i.totalAmount, 0);
  const outstanding = myInvoices.filter((i) => i.status === "SENT" || i.status === "OVERDUE" || i.status === "PARTIAL").reduce((s, i) => s + i.balanceDue, 0);
  const pendingInvoices = myInvoices.filter((i) => i.status === "DRAFT").length;
  const thisPeriodHours = timesheets.filter((t) => t.periodStart === period.start && t.periodEnd === period.end).reduce((s, t) => s + t.totalBillableHours, 0);
  const statusProgress = client.status === "ACTIVE" ? 100 : client.status === "PROSPECT" ? 50 : 25;
  const activeProjects = projects.filter((p) => p.status === "ACTIVE");

  const handleEdit = (data: Omit<Client, "id" | "clientCode" | "activeProjectCount" | "createdAt" | "updatedAt">) => {
    updateClient(client.id, data);
    addToast("success", "Client updated");
    setEditOpen(false);
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-institutional text-gray-700"><Building2 size={26} /></span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <StatusBadge status={client.status} label={client.status} />
            </div>
            <p className="text-sm text-gray-500">{client.clientCode} · {client.industry} · {client.clientTier.replace("_", " ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}><Pencil size={16} className="mr-2" />Edit</button>
          <button className="btn btn-primary" onClick={() => navigate(ROUTES.PROJECTS)}><FolderPlus size={16} className="mr-2" />New Project</button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Client Information</h2>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Name</dt><dd className="text-gray-900">{client.name}</dd>
                <dt className="text-gray-500">Client Code</dt><dd className="text-gray-900">{client.clientCode}</dd>
                <dt className="text-gray-500">Industry</dt><dd className="text-gray-900">{client.industry}</dd>
                <dt className="text-gray-500">Country</dt><dd className="text-gray-900">{client.country}</dd>
                <dt className="text-gray-500">Tier</dt><dd className="text-gray-900">{client.clientTier.replace("_", " ")}</dd>
                <dt className="text-gray-500">Payment Terms</dt><dd className="text-gray-900">{client.paymentTerms.replace(/_/g, " ")}</dd>
                <dt className="text-gray-500">Created</dt><dd className="text-gray-900">{new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd>
              </dl>
            </div>

            <div className="card">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Client Status Progress</h2>
              <Progress value={statusProgress} showLabel />
              <p className="mt-2 text-xs text-gray-500">Prospect → Active → Inactive lifecycle</p>
              <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-900">Primary Contact</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li className="flex items-center gap-2"><Mail size={14} className="text-gray-400" />{client.primaryContact.name} · {client.primaryContact.email}</li>
                <li className="flex items-center gap-2"><Phone size={14} className="text-gray-400" />{client.primaryContact.phone}</li>
                <li className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" />{client.billingAddress.city}, {client.billingAddress.country}</li>
              </ul>
            </div>

            <div className="card lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Financial Summary</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Total Invoiced" value={formatCurrency(totalInvoiced)} />
                <Stat label="Outstanding Balance" value={formatCurrency(outstanding)} />
                <Stat label="Pending Invoices" value={String(pendingInvoices)} />
                <Stat label="This Period Hours" value={`${Math.round(thisPeriodHours)} h`} />
              </div>
              <h3 className="mt-5 mb-2 text-sm font-semibold text-gray-900">Active Projects ({activeProjects.length})</h3>
              {activeProjects.length === 0 ? <p className="text-sm text-gray-500">No active projects.</p> : (
                <ul className="divide-y divide-gray-100">
                  {activeProjects.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.projectCode}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={p.progress} className="w-24" />
                        <span className="text-xs text-gray-500">Team {p.teamSize}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="pt-6">
          <DataTable
            data={[client.primaryContact]}
            keyExtractor={(c) => c.email}
            emptyState={{ title: "No contacts" }}
            columns={[
              { key: "name", header: "Name", cell: (c) => <span className="font-medium text-gray-900">{c.name}</span> },
              { key: "email", header: "Email", cell: (c) => c.email },
              { key: "phone", header: "Phone", cell: (c) => c.phone },
              { key: "role", header: "Role / Title", cell: (c) => c.role ?? "Primary Contact" },
              { key: "primary", header: "Department", cell: () => "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="projects" className="pt-6">
          <DataTable
            data={projects}
            keyExtractor={(p) => p.id}
            onRowClick={(p) => navigate(ROUTES.PROJECT_DETAIL.replace(":projectId", p.id))}
            emptyState={{ title: "No projects under this client" }}
            columns={[
              { key: "name", header: "Project", cell: (p) => <span className="font-medium text-gray-900">{p.name}</span> },
              { key: "projectCode", header: "Code", cell: (p) => p.projectCode },
              { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} kind="project" label={p.status} /> },
              { key: "progress", header: "Progress", cell: (p) => <Progress value={p.progress} className="w-24" /> },
              { key: "teamSize", header: "Team Size", cell: (p) => p.teamSize },
              { key: "startDate", header: "Start", cell: (p) => p.startDate },
              { key: "endDate", header: "End", cell: (p) => p.endDate },
              { key: "budget", header: "Budget", cell: (p) => (p.budget ? formatCurrency(p.budget, p.budgetCurrency ?? "USD") : "—") },
            ]}
          />
        </TabsContent>

        <TabsContent value="invoices" className="pt-6">
          <DataTable
            data={myInvoices}
            keyExtractor={(i) => i.id}
            emptyState={{ title: "No invoices" }}
            columns={[
              { key: "invoiceNumber", header: "Invoice", cell: (i) => <span className="font-medium text-gray-900">{i.invoiceNumber}</span> },
              { key: "periodLabel", header: "Period", cell: (i) => i.periodLabel ?? "—" },
              { key: "totalAmount", header: "Amount", cell: (i) => formatCurrency(i.totalAmount, i.currency) },
              { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} kind="invoice" /> },
              { key: "issueDate", header: "Issued", cell: (i) => i.issueDate },
              { key: "dueDate", header: "Due", cell: (i) => i.dueDate },
            ]}
          />
        </TabsContent>

        <TabsContent value="timesheets" className="pt-6">
          <DataTable
            data={timesheets}
            keyExtractor={(t) => t.id}
            emptyState={{ title: "No timesheets" }}
            columns={[
              { key: "employeeName", header: "Employee", cell: (t) => <span className="font-medium text-gray-900">{t.employeeName}</span> },
              { key: "periodLabel", header: "Period", cell: (t) => t.periodLabel },
              { key: "totalHours", header: "Hours", cell: (t) => `${t.totalHours} h` },
              { key: "billableAmount", header: "Billable Amount", cell: (t) => formatCurrency(t.billableAmount, t.currency) },
              { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} kind="timesheet" /> },
              { key: "reviewedBy", header: "Reviewed", cell: (t) => t.reviewedBy ?? "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="activity" className="pt-6">
          <ul className="divide-y divide-gray-100 card">
            {auditLogs.slice(0, 12).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-gray-900">{a.description}</p>
                  <p className="text-xs text-gray-500">{a.userName}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(a.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <ClientFormModal open={editOpen} initialData={client} onClose={() => setEditOpen(false)} onSubmit={handleEdit} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
