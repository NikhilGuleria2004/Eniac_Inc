import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { chartTooltipStyle, axisTick } from "../../lib/charts";

interface TimesheetSubmissionChartProps {
  data: { label: string; submitted: number; pending: number }[];
}

export function TimesheetSubmissionChart({ data }: TimesheetSubmissionChartProps) {
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
        <BarChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Legend wrapperStyle={{ paddingTop: 8 }} iconSize={10} iconType="circle" />
          <Bar dataKey="submitted" name="Submitted" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="pending" name="Pending" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
