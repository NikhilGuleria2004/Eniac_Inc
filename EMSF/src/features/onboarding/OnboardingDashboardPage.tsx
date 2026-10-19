import { useUrlState } from "../../lib/useUrlState";
import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { Employee } from "../../types";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { Navigate } from "react-router-dom";
import { deleteEmployee, getEmployees, getDocuments } from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable } from "../../components/tables/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { Progress } from "../../components/ui/Progress";
import { StatusBadge } from "../../components/data/StatusBadge";
import { StatCard } from "../../components/data/StatCard";
import { EmployeeAvatar } from "../../components/data/EmployeeAvatar";
import { getOnboardingProgress, getOnboardingStage, getOnboardingStepData, getOnboardingTargetDate } from "./onboarding";
const PAGE_SIZE = 10;
export function OnboardingDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "EMPLOYEE";
  const canCreate = hasPermission(role, "employee.create");
  const canDelete = hasPermission(role, "employee.delete");
  if (!hasPermission(role, "onboarding.manage")) return <Navigate to="/403" replace />;
  const [search, setSearch] = useUrlState("q");
  const [stageFilter, setStageFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const employees = useMemo(() => getEmployees(), [forceRefresh]);
  const documents = useMemo(() => getDocuments(), []);
  const records = useMemo(() => employees.map((e) => {
    const steps = getOnboardingStepData(e, documents);
    return { employee: e, steps, progress: getOnboardingProgress(steps), currentStage: getOnboardingStage(steps), target: getOnboardingTargetDate(e) };
  }), [employees, documents]);
  const inPipeline = records.filter((r) => r.currentStage !== "Completed");
  const docsPending = records.filter((r) => r.currentStage === "Documents").length;
  const hrReview = records.filter((r) => r.currentStage === "HR Review").length;
  const ready = records.filter((r) => ["Activation", "Timesheet Eligibility"].includes(r.currentStage)).length;
  const completed = records.filter((r) => r.currentStage === "Completed").length;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPipeline.filter((r) => {
      const e = r.employee;
      if (stageFilter !== "all" && r.currentStage !== stageFilter) return false;
      if (billingFilter !== "all" && e.billingStatus !== billingFilter) return false;
      if (!q) return true;
      return (e.firstName + " " + e.lastName).toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q);
    });
  }, [inPipeline, search, stageFilter, billingFilter]);
  const stages = useMemo(() => Array.from(new Set(inPipeline.map((r) => r.currentStage))), [inPipeline]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const resetPage = () => setPage(1);
  const handleDelete = async (e: Employee) => {
    if (!confirm(`Delete ${e.firstName} ${e.lastName} from onboarding? This cannot be undone.`)) return;
    setDeletingId(e.id);
    await deleteEmployee(e.id);
    setForceRefresh((n) => n + 1);
    setDeletingId(null);
  };
  return (
    <div className="page-container space-y-6">
      <PageHeader title="Employee Onboarding" description="Track every new hire through the 8-step activation workflow." breadcrumbs={[{ label: "Onboarding" }]}
        actions={canCreate ? (<NavLink to={ROUTES.EMPLOYEES + "/new"} className="btn btn-primary text-sm"><Plus aria-hidden="true" size={16} /> Add Employee</NavLink>) : undefined} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Onboarding" value={inPipeline.length} />
        <StatCard label="Documents Pending" value={docsPending} />
        <StatCard label="HR Review" value={hrReview} />
        <StatCard label="Ready" value={ready} />
        <StatCard label="Completed" value={completed} />
      </div>
      <div className="card"><div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <SearchInput placeholder="Search onboarding employees…" value={search} onChange={(v) => { setSearch(v); resetPage(); }} className="w-full lg:max-w-sm" />
        <FilterBar filters={[
          { key: "stage", label: "Stage", value: stageFilter, options: [{ label: "All Stages", value: "all" }, ...stages.map((s) => ({ label: s, value: s }))], onChange: (v) => { setStageFilter(v); resetPage(); } },
          { key: "billing", label: "Billing", value: billingFilter, options: [{ label: "All", value: "all" }, { label: "Billable", value: "BILLABLE" }, { label: "Non-Billable", value: "NON_BILLABLE" }], onChange: (v) => { setBillingFilter(v); resetPage(); } },
        ]} onClearAll={() => { setStageFilter("all"); setBillingFilter("all"); setSearch(""); resetPage(); }} />
      </div></div>
      <DataTable<{ employee: Employee; steps: unknown; progress: number; currentStage: string; target: string }>
        data={paged} keyExtractor={(r) => r.employee.id}
        onRowClick={(r) => navigate(ROUTES.ONBOARDING_DETAIL(r.employee.id))}
        emptyState={{ title: "No onboarding records", description: "Everyone is fully activated." }}
        columns={[
          { key: "employee", header: "Employee", sortable: true, cell: (r) => (
            <div className="flex items-center gap-3"><EmployeeAvatar firstName={r.employee.firstName} lastName={r.employee.lastName} avatar={r.employee.avatar} size="sm" />
            <div><NavLink to={ROUTES.ONBOARDING_DETAIL(r.employee.id)} onClick={(ev) => ev.stopPropagation()} className="font-medium text-gray-900 hover:text-accent hover:underline">{r.employee.firstName} {r.employee.lastName}</NavLink>
            <p className="text-xs text-gray-500">{r.employee.designation}</p></div></div>) },
          { key: "country", header: "Country", cell: (r) => (<span className="text-gray-600">{r.employee.country}</span>) },
          { key: "billing", header: "Billing", cell: (r) => <StatusBadge status={r.employee.billingStatus} /> },
          { key: "progress", header: "Progress", sortable: true, cell: (r) => (<div className="min-w-24 sm:min-w-32"><Progress value={r.progress} showLabel /></div>) },
          { key: "stage", header: "Current Stage", cell: (r) => (<span className="badge badge-info">{r.currentStage}</span>) },
          { key: "started", header: "Started", sortable: true, cell: (r) => (<span className="text-gray-600">{r.employee.joiningDate}</span>) },
          { key: "target", header: "Target Date", cell: (r) => (<span className="text-gray-600">{r.target}</span>) },
          { key: "owner", header: "Owner", cell: () => (<span className="text-gray-600">HR</span>) },
           ...(canDelete ? [{
             key: "delete",
             header: "",
             cell: (r: { employee: Employee }) => (
               <button
                 onClick={(ev) => { ev.stopPropagation(); handleDelete(r.employee); }}
                 className="p-1 text-red-600 hover:bg-red-100 rounded"
                 title="Delete employee"
                 disabled={deletingId === r.employee.id}
               >
                 {deletingId === r.employee.id ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Trash2 aria-hidden="true" size={16} />}
              </button>
            )
          }] : []),
        ]} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">Showing {(safePage - 1) * PAGE_SIZE + (paged.length > 0 ? 1 : 0)} to {(safePage - 1) * PAGE_SIZE + paged.length} of {filtered.length} onboarding</p>
        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
