import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { chartTooltipStyle, axisTick } from "../../lib/charts";

interface ResourceUtilizationChartProps {
  data: { name: string; allocation: number; billableHours: number }[];
}

export function ResourceUtilizationChart({ data }: ResourceUtilizationChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={axisTick}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            width={140}
          />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${Number(value)}%`, "Allocation"]} />
          <Bar dataKey="allocation" name="Allocation" fill="var(--color-accent)" radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
