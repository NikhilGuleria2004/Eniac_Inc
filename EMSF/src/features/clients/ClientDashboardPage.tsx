import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, Users, Plus, Search, TrendingUp, AlertCircle, Archive } from "lucide-react";
import { DataTable } from "../../components/tables/DataTable";
import { FilterBar } from "../../components/ui/FilterBar";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { getClients, createClient, updateClient, getProjects } from "../../data/mock/repositories";
import { computeClientKPIs, filterClients, getUniqueCountries, getUniqueIndustries, getUniqueStatuses, getActiveProjectCount } from "./clients";
import { ROUTES } from "../../data/constants";
import { useToast } from "../../components/ui/Toast";
import type { Client } from "../../types";

export function ClientDashboardPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const allClients = useMemo(() => getClients(), []);
  const allProjects = useMemo(() => getProjects(), []);

  const kpis = useMemo(() => computeClientKPIs(allClients, allProjects), [allClients, allProjects]);

  const filteredClients = useMemo(() => filterClients(allClients, { search, status: statusFilter, country: countryFilter, industry: industryFilter }), [allClients, search, statusFilter, countryFilter, industryFilter]);

  const countries = useMemo(() => getUniqueCountries(allClients), [allClients]);
  const industries = useMemo(() => getUniqueIndustries(allClients), [allClients]);

  const statusOptions = [{ label: "All", value: "all" }, ...getUniqueStatuses().map((s) => ({ label: s, value: s }))];
  const countryOptions = [{ label: "All", value: "all" }, ...countries.map((c) => ({ label: c, value: c }))];
  const industryOptions = [{ label: "All", value: "all" }, ...industries.map((i) => ({ label: i, value: i }))];

  const hasActiveFilters = statusFilter !== "all" || countryFilter !== "all" || industryFilter !== "all" || search !== "";

  const handleNewClient = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    if (editingClient) {
      updateClient(editingClient.id, data);
      addToast("success", "Client updated successfully");
    } else {
      const newClient = createClient(data);
      addToast("success", "Client created successfully");
      navigate(ROUTES.CLIENT_DETAIL(newClient.id));
    }
    setFormOpen(false);
    setEditingClient(null);
  };

  const columns = [
    {
      key: "name",
      header: "Client",
      cell: (row: Client) => (
        <Link to={ROUTES.CLIENT_DETAIL(row.id)} className="font-medium text-gray-900 hover:text-accent">
          {row.name}
        </Link>
      ),
    },
    { key: "clientCode", header: "Client Code", cell: (row: Client) => row.clientCode },
    { key: "country", header: "Country", cell: (row: Client) => row.country },
    {
      key: "primaryContact",
      header: "Primary Contact",
      cell: (row: Client) => (
        <div>
          <p className="text-gray-900">{row.primaryContact.name}</p>
          <p className="text-xs text-gray-500">{row.primaryContact.email}</p>
        </div>
      ),
    },
    {
      key: "activeProjectCount",
      header: "Active Projects",
      cell: (row: Client) => getActiveProjectCount(row.id),
    },
    { key: "status", header: "Status", cell: (row: Client) => <StatusBadge status={row.status} /> },
    { key: "createdAt", header: "Created", cell: (row: Client) => new Date(row.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
    {
      key: "actions",
      header: "Actions",
      cell: (row: Client) => (
        <button onClick={(e) => { e.stopPropagation(); handleEditClient(row); }} className="text-accent hover:underline text-sm">Edit</button>
      ),
    },
  ];

  return (
     <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Client Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage client relationships and track project engagements</p>
        </div>
        <button onClick={handleNewClient} className="btn btn-primary">
          <Plus size={16} className="mr-2" />
          Add Client
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Clients" value={kpis.total} icon={<Building2 size={20} />} />
        <StatCard label="Active" value={kpis.active} icon={<Users size={20} />} variant="success" />
        <StatCard label="Prospect" value={kpis.prospect} icon={<TrendingUp size={20} />} variant="warning" />
        <StatCard label="Inactive" value={kpis.inactive} icon={<Archive size={20} />} variant="neutral" />
        <StatCard label="Active Projects" value={kpis.totalActiveProjects} icon={<AlertCircle size={20} />} variant="info" />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200">
          <div className="flex-1 max-w-xs">
            <label className="sr-only">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, code, contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <FilterBar
            filters={[
              { key: "status", label: "Status", value: statusFilter, options: statusOptions, onChange: setStatusFilter },
              { key: "country", label: "Country", value: countryFilter, options: countryOptions, onChange: setCountryFilter },
              { key: "industry", label: "Industry", value: industryFilter, options: industryOptions, onChange: setIndustryFilter },
            ]}
            onClearAll={() => { setSearch(""); setStatusFilter("all"); setCountryFilter("all"); setIndustryFilter("all"); }}
          />
        </div>
        <DataTable
          data={filteredClients}
          columns={columns}
          keyExtractor={(row) => row.id}
          emptyState={{
            title: "No clients found",
            description: hasActiveFilters ? "Try adjusting your filters or search terms." : "Add your first client to get started.",
          }}
        />
      </div>

      <ClientFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditingClient(null); }} initialData={editingClient} onSubmit={handleFormSubmit} />
    </div>
  );
}

function StatCard({ label, value, icon, variant = "default" }: { label: string; value: number; icon: React.ReactNode; variant?: "default" | "success" | "warning" | "neutral" | "info" }) {
  const bgColors = { default: "bg-gray-50", success: "bg-green-50", warning: "bg-yellow-50", neutral: "bg-gray-100", info: "bg-blue-50" };
  const textColors = { default: "text-gray-900", success: "text-green-700", warning: "text-yellow-700", neutral: "text-gray-700", info: "text-blue-700" };
  return (
    <div className={`card ${bgColors[variant]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-semibold ${textColors[variant]} mt-1`}>{value}</p>
        </div>
        <div className={textColors[variant]}>{icon}</div>
      </div>
    </div>
  );
}

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  initialData: Client | null;
  onSubmit: (data: any) => void;
}

function ClientFormModal({ open, onClose, initialData, onSubmit }: ClientFormModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    country: "United States",
    industry: "Technology",
    primaryContact: { name: "", email: "", phone: "" },
    status: "ACTIVE" as Client["status"],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        country: initialData.country,
        industry: initialData.industry,
        primaryContact: { ...initialData.primaryContact },
        status: initialData.status,
      });
    } else {
      setFormData({ name: "", country: "United States", industry: "Technology", primaryContact: { name: "", email: "", phone: "" }, status: "ACTIVE" });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const countries = ["India", "United States"];
  const industries = ["Technology", "Manufacturing", "Consulting", "Healthcare", "Financial Services", "E-commerce", "Media & Entertainment", "Education", "Telecommunications", "Energy"];
  const statuses = ["ACTIVE", "PROSPECT", "INACTIVE", "SUSPENDED", "CLOSED"] as const;

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={initialData ? "Edit Client" : "Add Client"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Code</label>
            <input type="text" value={initialData?.clientCode || "Auto-generated"} className="form-input bg-gray-50" readOnly />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
            <select value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="form-input" required>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
            <select value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} className="form-input" required>
              {industries.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4 mt-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Primary Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={formData.primaryContact.name} onChange={(e) => setFormData({ ...formData, primaryContact: { ...formData.primaryContact, name: e.target.value } })} className="form-input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={formData.primaryContact.email} onChange={(e) => setFormData({ ...formData, primaryContact: { ...formData.primaryContact, email: e.target.value } })} className="form-input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input type="tel" value={formData.primaryContact.phone} onChange={(e) => setFormData({ ...formData, primaryContact: { ...formData.primaryContact, phone: e.target.value } })} className="form-input" required />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
          <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as Client["status"] })} className="form-input" required>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary">{initialData ? "Save Changes" : "Create Client"}</button>
        </div>
      </form>
    </Modal>
  );
}