import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { chartTooltipStyle, type DonutPoint } from "../../lib/charts";

interface DonutChartProps {
  data: DonutPoint[];
  emptyMessage?: string;
}

export function ClientIndustryChart({ data, emptyMessage = "No data available" }: DonutChartProps) {
  const filtered = data.filter((d) => d.value > 0);

  if (filtered.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            labelLine={false}
            fontSize={11}
          >
            {filtered.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend wrapperStyle={{ paddingTop: 8 }} iconSize={10} iconType="circle" layout="horizontal" align="center" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
