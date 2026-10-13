import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { chartTooltipStyle, axisTick, formatCurrency } from "../../lib/charts";

interface RevenueTrendChartProps {
  data: { label: string; revenue: number }[];
  currency?: string;
}

export function RevenueTrendChart({ data, currency = "USD" }: RevenueTrendChartProps) {
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
        <LineChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatCurrency(v, currency)}
            width={80}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value) => [formatCurrency(Number(value), currency), "Revenue"]}
          />
          <Legend wrapperStyle={{ paddingTop: 8 }} iconSize={10} iconType="circle" />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
