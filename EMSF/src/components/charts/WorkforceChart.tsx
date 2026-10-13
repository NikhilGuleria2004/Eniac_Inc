import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface WorkforceDataPoint {
  month: string;
  headcount: number;
  newHires: number;
  exits: number;
}

interface WorkforceChartProps {
  data: WorkforceDataPoint[];
}

export function WorkforceChart({ data }: WorkforceChartProps) {
  return (
    <div className="w-full h-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(16, 24, 40, 0.08)",
              fontSize: "12px",
            }}
            labelStyle={{ color: "var(--color-text)", fontWeight: 600 }}
            formatter={(value: unknown) => [(value as number).toLocaleString(), ""]}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8 }}
            iconSize={10}
            iconType="circle"
            layout="horizontal"
            align="center"
          />
          <Line
            type="monotone"
            dataKey="headcount"
            name="Total Headcount"
            stroke="#1D4ED8"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: "#1D4ED8" }}
            activeDot={{ r: 6, strokeWidth: 3 }}
          />
          <Line
            type="monotone"
            dataKey="newHires"
            name="New Hires"
            stroke="#16803C"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: "#16803C" }}
            activeDot={{ r: 6, strokeWidth: 3 }}
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="exits"
            name="Exits"
            stroke="#C53030"
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: "#C53030" }}
            activeDot={{ r: 6, strokeWidth: 3 }}
            strokeDasharray="3 3"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}