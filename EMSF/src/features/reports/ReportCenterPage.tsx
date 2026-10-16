import { useUrlState } from "../../lib/useUrlState";
import { useState, useMemo } from "react";
import { BarChart3, FileText, Download, Users, Clock, Calendar, File, Briefcase, ListTodo, DollarSign, Search } from "lucide-react";
import { DataTable } from "../../components/tables/DataTable";
import { FilterBar } from "../../components/ui/FilterBar";
import { Modal } from "../../components/ui/Modal";
import { REPORT_CATEGORIES, REPORT_DEFINITIONS, generateReportData } from "./reports";
import type { ReportDefinition, ReportResult } from "./reports";
import { StatusDistributionChart } from "../../components/charts/StatusDistributionChart";
import { LeaveStatusChart } from "../../components/charts/LeaveStatusChart";
import { useToast } from "../../components/ui/Toast";
import {
  EMPLOYEE_STATUS_COLORS,
  PROJECT_STATUS_COLORS,
  LEAVE_STATUS_COLORS,
  DOCUMENT_STATUS_COLORS,
  ASSIGNMENT_STATUS_COLORS,
  CHART_FALLBACK_COLOR,
} from "../../components/charts/palette";

export function ReportCenterPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useUrlState("q");
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);

  const filteredReports = useMemo(() => {
    return REPORT_DEFINITIONS.filter((r) => {
      const matchesCategory = selectedCategory === "all" || r.category === selectedCategory;
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, search]);

  const categoryOptions = [
    { label: "All Categories", value: "all" },
    ...REPORT_CATEGORIES.map((c) => ({ label: c.label, value: c.id })),
  ];

  const handleReportClick = (report: ReportDefinition) => {
    setSelectedReport(report);
  };

  return (
     <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reports Center</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and export reports across all modules</p>
        </div>
        <div className="flex-1 max-w-xs">
          <label className="sr-only" htmlFor="search-reports">Search reports</label>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input id="search-reports"
              type="text"
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </div>
      </div>

      <FilterBar
        filters={[
          { key: "category", label: "Category", value: selectedCategory, options: categoryOptions, onChange: setSelectedCategory },
        ]}
        onClearAll={() => { setSearch(""); setSelectedCategory("all"); }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report) => {
          const Icon = getCategoryIcon(report.category);
          const category = REPORT_CATEGORIES.find((c) => c.id === report.category);
          return (
            <div
              key={report.id}
              onClick={() => handleReportClick(report)}
              className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-md ${getCategoryColor(report.category)}`}>
                  <Icon size={20} className="text-gray-700" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase">{category?.label}</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">{report.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{report.description}</p>
            </div>
          );
        })}
        {filteredReports.length === 0 && (
          <div className="col-span-full card text-center py-12">
            <FileText aria-hidden="true" size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter.</p>
          </div>
        )}
      </div>

      {selectedReport && (
        <ReportDetailModal
          open={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          report={selectedReport}
        />
      )}
    </div>
  );
}

function getCategoryIcon(category: string) {
  const icons: Record<string, React.FC<{ size: number; className?: string }>> = {
    workforce: Users,
    attendance: Clock,
    leave: Calendar,
    compensation: DollarSign,
    documents: File,
    projects: Briefcase,
    assignments: ListTodo,
  };
  const Icon = icons[category] || BarChart3;
  return Icon;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    workforce: "bg-blue-50",
    attendance: "bg-indigo-50",
    leave: "bg-green-50",
    compensation: "bg-amber-50",
    documents: "bg-purple-50",
    projects: "bg-cyan-50",
    assignments: "bg-rose-50",
  };
  return colors[category] || "bg-gray-50";
}

interface ReportDetailModalProps {
  open: boolean;
  onClose: () => void;
  report: ReportDefinition;
}

function ReportDetailModal({ open, onClose, report }: ReportDetailModalProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");

  const reportData = useMemo(() => generateReportData(report), [report]);

  const handleExport = () => {
    const extension = exportFormat === "csv" ? "csv" : "pdf";
    const filename = `${report.id.replace(/-/g, "_")}_${new Date().getFullYear()}${new Date().getMonth() + 1}${new Date().getDate()}.${extension}`;
    addToast("success", `${report.name} exported as ${extension.toUpperCase()} (${filename})`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={report.name}
      description={report.description}
      size="xl"
      footer={
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as "csv" | "pdf")} className="form-input w-auto text-sm">
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn btn-secondary">
              <FileText aria-hidden="true" size={16} className="mr-2" />
              Print
            </button>
            <button onClick={handleExport} className="btn btn-primary">
              <Download aria-hidden="true" size={16} className="mr-2" />
              Export
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("table")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "table" ? "border-accent text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Table View
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "chart" ? "border-accent text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Chart View
          </button>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-3">
            Generated on {reportData.generatedAt} · {reportData.rows.length} rows
          </p>

          {activeTab === "table" ? (
            <div className="max-h-96 overflow-y-auto">
              <DataTable
                data={reportData.rows}
                columns={reportData.columns.map((col) => ({
                  key: col,
                  header: col.replace(/_/g, " "),
                  cell: (row: any) => formatCellValue(row[col]),
                }))}
                keyExtractor={(row: any) => `${report.id}-${JSON.stringify(row).slice(0, 50)}`}
                emptyState={{ title: "No data available for this report." }}
              />
            </div>
          ) : (
            <div className="h-80">
              {renderChart(report.category, reportData)}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function formatCellValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-gray-400">—</span>;
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return <span className="text-sm text-gray-900">{String(value)}</span>;
}

function renderChart(category: string, reportData: ReportResult): React.ReactNode {
  if (category === "workforce") {
    const statusCounts: Record<string, number> = {};
    reportData.rows.forEach((row) => {
      const status = String(row["Status"] || row["Employment Status"] || "UNKNOWN");
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      fill: getStatusFill(status),
    }));
    if (chartData.length === 0) return <div className="text-center text-gray-400 py-8">No data to display</div>;
    return <StatusDistributionChart data={chartData} />;
  }
  if (category === "leave") {
    const typeCounts: Record<string, number> = {};
    reportData.rows.forEach((row) => {
      const leaveType = String(row["Type"] || "UNKNOWN");
      typeCounts[leaveType] = (typeCounts[leaveType] || 0) + 1;
    });
    const statusCounts: Record<string, number> = {};
    reportData.rows.forEach((row) => {
      const status = String(row["Status"] || "UNKNOWN");
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    if (Object.keys(typeCounts).length === 0 && Object.keys(statusCounts).length === 0) {
      return <div className="text-center text-gray-400 py-8">No data to display</div>;
    }
    return <LeaveStatusChart leaveTypeCounts={typeCounts} leaveStatusCounts={statusCounts} />;
  }
  return <div className="text-center text-gray-400 py-8">Chart view available for Workforce and Leave reports</div>;
}

function getStatusFill(status: string): string {
  return (
    EMPLOYEE_STATUS_COLORS[status] ??
    PROJECT_STATUS_COLORS[status] ??
    LEAVE_STATUS_COLORS[status] ??
    DOCUMENT_STATUS_COLORS[status] ??
    ASSIGNMENT_STATUS_COLORS[status] ??
    CHART_FALLBACK_COLOR
  );
}
