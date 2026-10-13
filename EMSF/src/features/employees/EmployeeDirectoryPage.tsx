import { useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Download, Trash2, Loader2 } from "lucide-react";
import type { Employee } from "../../types";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { deleteEmployee, getEmployees, getProjects, getAssignmentsByEmployee } from "../../data/mock/repositories";
import { ROUTES, DEPARTMENTS } from "../../data/constants";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable } from "../../components/tables/DataTable";
import { SearchInput } from "../../components/ui/SearchInput";
import { FilterBar } from "../../components/ui/FilterBar";
import { Pagination } from "../../components/ui/Pagination";
import { StatusBadge } from "../../components/data/StatusBadge";
import { EmployeeAvatar } from "../../components/data/EmployeeAvatar";
const PAGE_SIZE = 10;
const EMPLOYMENT_STATUSES = ["ACTIVE","ONBOARDING","ON_LEAVE","SUSPENDED","RESIGNED","TERMINATED","INACTIVE"] as const;
export function EmployeeDirectoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? "EMPLOYEE";
  const canCreate = hasPermission(role, "employee.create");
  const canDelete = hasPermission(role, "employee.delete");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const employees = useMemo(() => getEmployees(), [forceRefresh]);
  const projects = useMemo(() => getProjects(), []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      if (statusFilter !== "all" && e.employmentStatus !== statusFilter) return false;
      if (deptFilter !== "all" && e.department !== deptFilter) return false;
      if (billingFilter !== "all" && e.billingStatus !== billingFilter) return false;
      if (!q) return true;
      return e.firstName.toLowerCase().includes(q) || e.lastName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.employeeCode.toLowerCase().includes(q) || e.designation.toLowerCase().includes(q);
    });
  }, [employees, search, statusFilter, deptFilter, billingFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const resetPage = () => setPage(1);
  const handleDelete = async (e: Employee) => {
    if (!confirm(`Delete ${e.firstName} ${e.lastName}? This cannot be undone.`)) return;
    setDeletingId(e.id);
    await deleteEmployee(e.id);
    setForceRefresh((n) => n + 1);
    setDeletingId(null);
  };
  const handleExport = () => {
    const header = "Employee Code,Name,Email,Designation,Department,Status,Billing,Joining Date";
    const rows = filtered.map((e) => [e.employeeCode, e.firstName + " " + e.lastName, e.email, e.designation, e.department, e.employmentStatus, e.billingStatus, e.joiningDate].join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "employees.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="page-container space-y-6">
      <PageHeader title="Employee Directory" description="Manage employee records and workforce information." breadcrumbs={[{ label: "Employees" }]}
        actions={<>
          <button className="btn btn-secondary text-sm" onClick={handleExport}><Download size={16} /> Export</button>
        </>} />
      <div className="card"><div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <SearchInput placeholder="Search by name, email, code, designation..." value={search} onChange={(v) => { setSearch(v); resetPage(); }} className="w-full lg:max-w-sm" />
        <FilterBar filters={[
          { key: "status", label: "Status", value: statusFilter, options: [{ label: "All Statuses", value: "all" }, ...EMPLOYMENT_STATUSES.map((s) => ({ label: s.replace(/_/g, " "), value: s }))], onChange: (v) => { setStatusFilter(v); resetPage(); } },
          { key: "dept", label: "Department", value: deptFilter, options: [{ label: "All Departments", value: "all" }, ...DEPARTMENTS.map((d) => ({ label: d, value: d }))], onChange: (v) => { setDeptFilter(v); resetPage(); } },
          { key: "billing", label: "Billing", value: billingFilter, options: [{ label: "All", value: "all" }, { label: "Billable", value: "BILLABLE" }, { label: "Non-Billable", value: "NON_BILLABLE" }], onChange: (v) => { setBillingFilter(v); resetPage(); } },
        ]} onClearAll={() => { setStatusFilter("all"); setDeptFilter("all"); setBillingFilter("all"); setSearch(""); resetPage(); }} />
      </div></div>
      <DataTable<Employee> data={paged} keyExtractor={(e) => e.id} selectable={canCreate} selectedRows={selected} onSelectionChange={setSelected}
        onRowClick={(e) => navigate(ROUTES.EMPLOYEE_DETAIL(e.id))}
        bulkActions={<span className="text-xs text-blue-700">{selected.length} employee(s) selected</span>}
        emptyState={{ title: "No employees found", description: "Try adjusting search or filters." }}
        columns={[
          { key: "name", header: "Employee", sortable: true, cell: (e) => (
            <div className="flex items-center gap-3">
              <EmployeeAvatar firstName={e.firstName} lastName={e.lastName} avatar={e.avatar} size="sm" />
              <div><NavLink to={ROUTES.EMPLOYEE_DETAIL(e.id)} onClick={(ev) => ev.stopPropagation()} className="font-medium text-gray-900 hover:text-accent hover:underline">{e.firstName} {e.lastName}</NavLink>
              <p className="text-xs text-gray-500">{e.employeeCode}</p></div>
            </div>) },
          { key: "designation", header: "Designation", sortable: true, cell: (e) => (<div><p className="text-gray-900">{e.designation}</p><p className="text-xs text-gray-500">{e.department}</p></div>) },
          { key: "country", header: "Location", cell: (e) => (<span className="text-gray-600">{e.city}, {e.country}</span>) },
          { key: "employmentStatus", header: "Status", sortable: true, cell: (e) => <StatusBadge status={e.employmentStatus} /> },
          { key: "billingStatus", header: "Billing", sortable: true, cell: (e) => <StatusBadge status={e.billingStatus} /> },
          { key: "project", header: "Project", cell: (e) => {
            const asgn = getAssignmentsByEmployee(e.id).find((a) => a.status === "ACTIVE");
            const proj = asgn ? projects.find((p) => p.id === asgn.projectId) : undefined;
            return <span className="text-gray-600">{proj ? proj.name : "\u2014"}</span>;
          } },
          { key: "joiningDate", header: "Joined", sortable: true, cell: (e) => (<span className="text-gray-600">{new Date(e.joiningDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>) },
           ...(canDelete ? [{
             key: "delete",
             header: "",
             cell: (e: Employee) => (
               <button
                 onClick={(ev) => { ev.stopPropagation(); handleDelete(e); }}
                 className="p-1 text-red-600 hover:bg-red-100 rounded"
                 title="Delete employee"
                 disabled={deletingId === e.id}
               >
                 {deletingId === e.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
               </button>
             )
           }] : []),
        ]} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">Showing {(safePage - 1) * PAGE_SIZE + (paged.length > 0 ? 1 : 0)} to {(safePage - 1) * PAGE_SIZE + paged.length} of {filtered.length} employees</p>
        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
