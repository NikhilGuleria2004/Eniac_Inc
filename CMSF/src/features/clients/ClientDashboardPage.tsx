import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, TrendingUp, Archive, FolderKanban, Plus, Search, Pencil, Ban } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Select } from "../../components/ui/Select";
import { DataTable } from "../../components/tables/DataTable";
import { StatusBadge } from "../../components/data/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { getClients, getProjects, updateClient } from "../../data/mock/repositories";
import { CLIENT_STATUSES, CLIENT_TIERS, ROUTES } from "../../data/constants";
import { computeClientKPIs, filterClients, uniqueCountries, uniqueIndustries } from "./clients";
import { ClientFormModal } from "./ClientFormModal";
import type { Client } from "../../types";

export function ClientDashboardPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [country, setCountry] = useState("all");
  const [industry, setIndustry] = useState("all");
  const [tier, setTier] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const allClients = useMemo(() => getClients(), []);
  const allProjects = useMemo(() => getProjects(), []);
  const kpis = useMemo(() => computeClientKPIs(allClients, allProjects), [allClients, allProjects]);
  const filtered = useMemo(
    () => filterClients(allClients, { search, status, country, industry, tier }),
    [allClients, search, status, country, industry, tier]
  );
  const hasFilters = status !== "all" || country !== "all" || industry !== "all" || tier !== "all" || search !== "";

  const statusOptions = [{ label: "All Statuses", value: "all" }, ...CLIENT_STATUSES.map((s) => ({ label: s, value: s }))];
  const countryOptions = [{ label: "All Countries", value: "all" }, ...uniqueCountries(allClients).map((c) => ({ label: c, value: c }))];
  const industryOptions = [{ label: "All Industries", value: "all" }, ...uniqueIndustries(allClients).map((i) => ({ label: i, value: i }))];
  const tierOptions = [{ label: "All Tiers", value: "all" }, ...CLIENT_TIERS.map((t) => ({ label: t.replace("_", " "), value: t }))];

  const handleDeactivate = (client: Client) => {
    updateClient(client.id, { status: "INACTIVE" });
    addToast("success", `${client.name} deactivated`);
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Client Management"
        subtitle="Manage client relationships and track project engagements"
        actions={
          <button className="btn btn-primary" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={16} className="mr-2" />
            New Client
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Clients" value={kpis.total} icon={<Building2 size={20} />} />
        <StatCard label="Active" value={kpis.active} icon={<Users size={20} />} variant="success" />
        <StatCard label="Prospects" value={kpis.prospect} icon={<TrendingUp size={20} />} variant="warning" />
        <StatCard label="Inactive" value={kpis.inactive} icon={<Archive size={20} />} variant="default" />
        <StatCard label="Active Projects" value={kpis.totalActiveProjects} icon={<FolderKanban size={20} />} variant="info" />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, contact..."
              className="form-input pl-10"
            />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>{statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={country} onChange={(e) => setCountry(e.target.value)}>{countryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>{industryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select value={tier} onChange={(e) => setTier(e.target.value)}>{tierOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
          </div>
        </div>

        <DataTable
          data={filtered}
          keyExtractor={(c) => c.id}
          onRowClick={(c) => navigate(ROUTES.CLIENT_DETAIL.replace(":clientId", c.id))}
          emptyState={{
            title: "No clients found",
            description: hasFilters ? "Try adjusting your filters or search." : "Add your first client to get started.",
          }}
          columns={[
            {
              key: "name",
              header: "Client",
              cell: (c) => (
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-institutional text-gray-700"><Building2 size={16} /></span>
                  <span className="font-medium text-gray-900">{c.name}</span>
                </div>
              ),
            },
            { key: "clientCode", header: "Code", cell: (c) => c.clientCode },
            { key: "country", header: "Country", cell: (c) => c.country },
            { key: "industry", header: "Industry", cell: (c) => c.industry },
            { key: "primaryContact", header: "Primary Contact", cell: (c) => (
              <div><p className="text-gray-900">{c.primaryContact.name}</p><p className="text-xs text-gray-500">{c.primaryContact.email}</p></div>
            ) },
            { key: "activeProjectCount", header: "Active Projects", cell: (c) => c.activeProjectCount },
            { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} label={c.status} /> },
            { key: "createdAt", header: "Created", cell: (c) => new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
            {
              key: "actions",
              header: "Actions",
              cell: (c) => (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button className="text-accent hover:underline text-sm" onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil size={14} className="inline" /> Edit</button>
                  <button className="text-gray-500 hover:text-danger text-sm" onClick={() => handleDeactivate(c)}><Ban size={14} className="inline" /> Deactivate</button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <ClientFormModal
        open={formOpen}
        initialData={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={(data) => {
          if (editing) {
            updateClient(editing.id, data);
            addToast("success", "Client updated");
          }
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
