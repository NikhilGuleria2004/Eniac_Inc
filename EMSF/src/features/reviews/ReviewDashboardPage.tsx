import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, TrendingUp, CheckCircle, Clock, UserCheck, Plus, Search } from "lucide-react";
import { DataTable } from "../../components/tables/DataTable";
import { FilterBar } from "../../components/ui/FilterBar";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { getReviews, getEmployees, createReview } from "../../data/mock/repositories";
import { computeReviewKPIs, filterReviews, getUniqueReviewStatuses, getUniqueReviewPeriods, getEmployeeName, ratingToLabel, RATING_OPTIONS } from "./reviews";
import { ROUTES } from "../../data/constants";
import { useToast } from "../../components/ui/Toast";
import type { Review, Employee } from "../../types";

export function ReviewDashboardPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);

  const allReviews = useMemo(() => getReviews(), []);
  const allEmployees = useMemo(() => getEmployees(), []);

  const kpis = useMemo(() => computeReviewKPIs(allReviews), [allReviews]);
  const filteredReviews = useMemo(() => filterReviews(allReviews, { search, status: statusFilter, period: periodFilter }), [allReviews, search, statusFilter, periodFilter]);

  const statusOptions = [{ label: "All", value: "all" }, ...getUniqueReviewStatuses().map((s) => ({ label: s.replace("_", " "), value: s }))];
  const periodOptions = [{ label: "All", value: "all" }, ...getUniqueReviewPeriods(allReviews).map((p) => ({ label: p, value: p }))];

  const hasActiveFilters = statusFilter !== "all" || periodFilter !== "all" || search !== "";

  const handleNewReview = () => {
    setFormOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    const newReview = createReview(data);
    addToast("success", `Review scheduled for ${getEmployeeName(newReview.employeeId)}`);
    setFormOpen(false);
    navigate(ROUTES.REVIEW_DETAIL(newReview.id));
  };

  const columns = [
    {
      key: "employeeId",
      header: "Employee",
      cell: (row: Review) => {
        const emp = allEmployees.find((e) => e.id === row.employeeId);
        return emp ? (
          <div className="flex items-center gap-3">
            <img src={emp.avatar} alt={emp.firstName} className="w-8 h-8 rounded-full" />
            <div>
              <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
              <p className="text-xs text-gray-500">{emp.designation}</p>
            </div>
          </div>
        ) : (
          <span className="text-gray-500">—</span>
        );
      },
    },
    {
      key: "reviewPeriod",
      header: "Period",
      cell: (row: Review) => <span className="text-sm text-gray-900">{row.reviewPeriod}</span>,
    },
    {
      key: "reviewerId",
      header: "Reviewer",
      cell: (row: Review) => <span className="text-sm text-gray-700">{getEmployeeName(row.reviewerId)}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      cell: (row: Review) => (
        <div className="flex items-center gap-1">
          <span className="font-medium text-gray-900">{row.rating}/5</span>
          <span className="text-xs text-gray-500">({ratingToLabel(row.rating)})</span>
        </div>
      ),
    },
    {
      key: "reviewDate",
      header: "Review Date",
      cell: (row: Review) => <span className="text-sm text-gray-600">{new Date(row.reviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: Review) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row: Review) => (
        <Link to={ROUTES.REVIEW_DETAIL(row.id)} className="text-accent hover:underline text-sm">View</Link>
      ),
    },
  ];

  return (
     <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Employee Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">Manage performance reviews, ratings, and feedback for all employees</p>
        </div>
        <button onClick={handleNewReview} className="btn btn-primary">
          <Plus size={16} className="mr-2" />
          Schedule Review
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Total Reviews" value={kpis.total} icon={<ClipboardCheck size={20} />} />
        <StatCard label="Scheduled" value={kpis.scheduled} icon={<Clock size={20} />} variant="info" />
        <StatCard label="In Progress" value={kpis.inProgress} icon={<UserCheck size={20} />} variant="warning" />
        <StatCard label="Completed" value={kpis.completed} icon={<CheckCircle size={20} />} variant="success" />
        <StatCard label="Acknowledged" value={kpis.acknowledged} icon={<CheckCircle size={20} />} variant="neutral" />
        <StatCard label="Avg Rating" value={kpis.avgRating.toFixed(1)} icon={<TrendingUp size={20} />} />
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200">
          <div className="flex-1 max-w-xs">
            <label className="sr-only">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by employee, reviewer, period..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>
          <FilterBar
            filters={[
              { key: "status", label: "Status", value: statusFilter, options: statusOptions, onChange: setStatusFilter },
              { key: "period", label: "Period", value: periodFilter, options: periodOptions, onChange: setPeriodFilter },
            ]}
            onClearAll={() => { setSearch(""); setStatusFilter("all"); setPeriodFilter("all"); }}
          />
        </div>
        <DataTable
          data={filteredReviews}
          columns={columns}
          keyExtractor={(row) => row.id}
          emptyState={{
            title: "No reviews found",
            description: hasActiveFilters ? "Try adjusting your filters or search terms." : "Schedule your first review to get started.",
          }}
        />
      </div>

      <ReviewFormModal open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} employees={allEmployees} />
    </div>
  );
}

function StatCard({ label, value, icon, variant = "default" }: { label: string; value: number | string; icon: React.ReactNode; variant?: "default" | "success" | "warning" | "neutral" | "info" }) {
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
interface ReviewFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  employees: Employee[];
}

function ReviewFormModal({ open, onClose, onSubmit, employees }: ReviewFormModalProps) {
  const [formData, setFormData] = useState({
    employeeId: "",
    reviewerId: "",
    reviewPeriod: "2025-2026",
    rating: 3,
    strengths: "",
    improvementAreas: "",
    goals: "",
    comments: "",
    reviewDate: new Date().toISOString().split("T")[0],
  });

  const reviewerableEmployees = employees.filter((e) => ["ADMIN", "HR", "MANAGER", "SUPERVISOR"].includes(e.role));
  const manageableEmployees = employees.filter((e) => e.employmentStatus === "ACTIVE");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Schedule New Review" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
            <select value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} className="form-input" required>
              <option value="">Select employee</option>
              {manageableEmployees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.designation})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer *</label>
            <select value={formData.reviewerId} onChange={(e) => setFormData({ ...formData, reviewerId: e.target.value })} className="form-input" required>
              <option value="">Select reviewer</option>
              {reviewerableEmployees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.designation})</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review Period *</label>
            <input type="text" value={formData.reviewPeriod} onChange={(e) => setFormData({ ...formData, reviewPeriod: e.target.value })} className="form-input" placeholder="e.g. 2025-2026" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Review Date *</label>
            <input type="date" value={formData.reviewDate} onChange={(e) => setFormData({ ...formData, reviewDate: e.target.value })} className="form-input" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating *</label>
          <select value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })} className="form-input" required>
            {RATING_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Strengths</label>
          <textarea value={formData.strengths} onChange={(e) => setFormData({ ...formData, strengths: e.target.value })} className="form-input" rows={2} placeholder="Key strengths demonstrated..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Improvement Areas</label>
          <textarea value={formData.improvementAreas} onChange={(e) => setFormData({ ...formData, improvementAreas: e.target.value })} className="form-input" rows={2} placeholder="Areas for improvement..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
          <textarea value={formData.goals} onChange={(e) => setFormData({ ...formData, goals: e.target.value })} className="form-input" rows={2} placeholder="Performance goals for the next cycle..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
          <textarea value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} className="form-input" rows={2} placeholder="Additional comments..." />
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary">Schedule Review</button>
        </div>
      </form>
    </Modal>
  );
}
