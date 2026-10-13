import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface StatusDataPoint {
  status: string;
  count: number;
  fill: string;
}

interface StatusDistributionChartProps {
  data: StatusDataPoint[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  ONBOARDING: "Onboarding",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  RESIGNED: "Resigned",
  TERMINATED: "Terminated",
};

export function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const filteredData = data.filter((d) => d.count > 0);

  if (filteredData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-w-0">
   <ResponsiveContainer width="100%" height="70%" minWidth={0}>
     <PieChart>
       <Pie
         data={filteredData}
         cx="50%"
         cy="50%"
         innerRadius={55}
         outerRadius={80}
         paddingAngle={2}
         dataKey="count"
         nameKey="status"
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         label={(props: any) =>
           `${STATUS_LABELS[props.name] || props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`
         }
         labelLine={false}
         fontSize={10}
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
         labelFormatter={(label: any) => (typeof label === "string" ? STATUS_LABELS[label] || label : String(label))}
       />
     </PieChart>
   </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {filteredData.map((entry) => (
          <div key={entry.status} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-xs text-gray-600">
              {STATUS_LABELS[entry.status] || entry.status}: {entry.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}