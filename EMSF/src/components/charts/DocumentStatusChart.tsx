import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DocumentStatusDataPoint {
  status: string;
  count: number;
  fill: string;
}

interface DocumentStatusChartProps {
  documentStatusData: DocumentStatusDataPoint[];
}

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export function DocumentStatusChart({ documentStatusData }: DocumentStatusChartProps) {
  const filteredData = documentStatusData.filter((d) => d.count > 0);

  if (filteredData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-w-0">
      <ResponsiveContainer width="100%" height="85%" minWidth={0}>
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={2}
            dataKey="count"
            nameKey="status"
            label={(props: any) =>
              `${DOCUMENT_STATUS_LABELS[props.name] || props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
            fontSize={11}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(16, 24, 40, 0.08)",
              fontSize: "12px",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [(value as number).toLocaleString(), ""]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(label: any) => (typeof label === "string" ? DOCUMENT_STATUS_LABELS[label] || label : String(label))}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8 }}
            iconSize={10}
            iconType="circle"
            layout="horizontal"
            align="center"
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {filteredData.map((entry) => (
          <div key={entry.status} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
            <span className="text-xs text-gray-600">{DOCUMENT_STATUS_LABELS[entry.status] || entry.status}: {entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}