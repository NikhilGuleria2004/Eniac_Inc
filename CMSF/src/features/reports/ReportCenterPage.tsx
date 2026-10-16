import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { BarChart3, ChevronRight } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { REPORT_CATEGORIES, REPORT_DEFINITIONS, getReportById, type ReportDefinition } from "./reportDefinitions";
import { ReportDetailModal } from "./ReportDetailModal";

export function ReportCenterPage() {
  const { reportId } = useParams();
  const [selected, setSelected] = useState<ReportDefinition | null>(() => (reportId ? getReportById(reportId) ?? null : null));

  const byCategory = useMemo(() => {
    const map = new Map<string, ReportDefinition[]>();
    for (const cat of REPORT_CATEGORIES) {
      map.set(cat, REPORT_DEFINITIONS.filter((r) => r.category === cat));
    }
    return map;
  }, []);

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Reports" subtitle="Operational and financial reporting across the CMS" />

      {REPORT_CATEGORIES.map((category) => {
        const reports = byCategory.get(category) ?? [];
        if (reports.length === 0) return null;
        return (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{category}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelected(report)}
                  className="card card-hover flex items-center justify-between text-left transition-colors hover:border-accent/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-institutional text-gray-700"><BarChart3 size={20} /></span>
                    <div>
                      <p className="font-medium text-gray-900">{report.name}</p>
                      <p className="text-xs text-gray-500">{report.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-400" />
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <ReportDetailModal open={!!selected} report={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
