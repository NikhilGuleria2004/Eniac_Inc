import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/Tabs";
import { LEAVE_TYPE_COLORS, LEAVE_STATUS_COLORS, CHART_FALLBACK_COLOR } from "./palette";

interface LeaveStatusChartProps {
  leaveTypeCounts: Record<string, number>;
  leaveStatusCounts: Record<string, number>;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  PAID: "Paid Leave",
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
  UNPAID: "Unpaid Leave",
};

const LEAVE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function LeaveStatusChart({ leaveTypeCounts, leaveStatusCounts }: LeaveStatusChartProps) {
  return (
    <Tabs defaultValue="type" className="w-full h-full">
      <TabsList className="grid w-full grid-cols-2 mb-3 bg-transparent">
        <TabsTrigger value="type" className="text-xs px-2 py-1">By Type</TabsTrigger>
        <TabsTrigger value="status" className="text-xs px-2 py-1">By Status</TabsTrigger>
      </TabsList>
      <TabsContent value="type" className="h-[calc(100%-40px)]">
        <LeaveBarChart
          data={Object.entries(leaveTypeCounts).map(([name, value]) => ({
            name: LEAVE_TYPE_LABELS[name] || name,
            value,
            fill: LEAVE_TYPE_COLORS[name] || CHART_FALLBACK_COLOR,
          }))}
          labelKey="name"
        />
      </TabsContent>
      <TabsContent value="status" className="h-[calc(100%-40px)]">
        <LeaveBarChart
          data={Object.entries(leaveStatusCounts).map(([name, value]) => ({
            name: LEAVE_STATUS_LABELS[name] || name,
            value,
            fill: LEAVE_STATUS_COLORS[name] || CHART_FALLBACK_COLOR,
          }))}
          labelKey="name"
        />
      </TabsContent>
    </Tabs>
  );
}

interface BarChartDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface LeaveBarChartProps {
  data: BarChartDataPoint[];
  labelKey: string;
}

function LeaveBarChart({ data }: LeaveBarChartProps) {
  const filteredData = data.filter((d) => d.value > 0);

  if (filteredData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={filteredData} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-muted)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            width={80}
          />
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
            labelStyle={{ color: "var(--color-text)", fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ paddingTop: 8 }}
            iconSize={10}
            iconType="circle"
            layout="horizontal"
            align="center"
          />
          <Bar
            dataKey="value"
            name="Count"
            radius={[0, 4, 4, 0]}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}