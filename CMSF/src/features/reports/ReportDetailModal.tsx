import { Download, FileSpreadsheet, FileText as FileTextIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { DataTable } from "../../components/tables/DataTable";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { axisTick } from "../../lib/charts";
import { CHART_COLORS } from "../../lib/charts";
import type { ReportDefinition, ReportResult } from "./reportDefinitions";

interface ReportDetailModalProps {
  open: boolean;
  report: ReportDefinition | null;
  onClose: () => void;
}

function buildResult(report: ReportDefinition): ReportResult {
  return report.build();
}

function toCsv(report: ReportDefinition, result: ReportResult): string {
  const header = result.columns.map((c) => c.header).join(",");
  const body = result.rows
    .map((row) => result.columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return `${report.name}\n${header}\n${body}`;
}

export function ReportDetailModal({ open, report, onClose }: ReportDetailModalProps) {
  const { addToast } = useToast();
  if (!report) return null;
  const result = buildResult(report);

  const downloadCsv = () => {
    const csv = toCsv(report, result);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("success", `${report.name}.csv downloaded`);
  };

  const downloadPdf = () => addToast("info", "PDF export simulated (frontend shell)");

  return (
    <Modal open={open} onClose={onClose} title={report.name} description={report.description} size="xl">
      <div className="mb-4 flex items-center justify-end gap-2">
        <button className="btn btn-secondary" onClick={downloadCsv}><FileSpreadsheet size={16} className="mr-2" />Export CSV</button>
        <button className="btn btn-secondary" onClick={downloadPdf}><Download size={16} className="mr-2" />Download PDF</button>
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="chart">Chart View</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="pt-4">
          {result.rows.length === 0 ? (
            <p className="text-sm text-gray-500">No data for this report.</p>
          ) : (
            <DataTable
              data={result.rows as Record<string, string | number>[]}
              keyExtractor={(row) => String(row[result.columns[0]?.key ?? "id"] ?? JSON.stringify(row))}
              columns={result.columns.map((c) => ({ key: c.key, header: c.header }))}
            />
          )}
        </TabsContent>

        <TabsContent value="chart" className="pt-4">
          {result.chart ? (
            <div className="h-80">
              {result.chart.type === "bar" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.chart.data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="value" name="Value" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={result.chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {result.chart.data.map((entry, i) => (
                        <Cell key={i} fill={(entry as { fill?: string }).fill ?? CHART_COLORS.palette[i % CHART_COLORS.palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <div className="flex h-80 items-center justify-center text-sm text-gray-400">
              <FileTextIcon size={20} className="mr-2" /> No chart for this report
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Modal>
  );
}
