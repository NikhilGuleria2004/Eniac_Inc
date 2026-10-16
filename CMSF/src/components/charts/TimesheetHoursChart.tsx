import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { chartTooltipStyle, axisTick } from "../../lib/charts";

interface TimesheetHoursChartProps {
  data: { name: string; hours: number }[];
}

export function TimesheetHoursChart({ data }: TimesheetHoursChartProps) {
  const filtered = data.filter((d) => d.hours > 0);
  if (filtered.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        No hours logged
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filtered} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${Number(value)} h`, "Hours"]} />
          <Bar dataKey="hours" name="Hours" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
