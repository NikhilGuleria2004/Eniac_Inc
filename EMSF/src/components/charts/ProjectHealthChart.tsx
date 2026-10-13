import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/Tabs";

interface HealthDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface ProjectHealthChartProps {
  healthData: HealthDataPoint[];
  statusData: HealthDataPoint[];
}

const HEALTH_LABELS: Record<string, string> = {
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
  DELAYED: "Delayed",
  COMPLETED: "Completed",
  PLANNING: "Planning",
  ON_HOLD: "On Hold",
  ACTIVE: "Active",
  CANCELLED: "Cancelled",
};

export function ProjectHealthChart({ healthData, statusData }: ProjectHealthChartProps) {
  return (
    <Tabs defaultValue="health" className="w-full h-full">
      <TabsList className="grid w-full grid-cols-2 mb-3 bg-transparent">
        <TabsTrigger value="health" className="text-xs px-2 py-1">Health</TabsTrigger>
        <TabsTrigger value="status" className="text-xs px-2 py-1">Status</TabsTrigger>
      </TabsList>
      <TabsContent value="health" className="h-[calc(100%-40px)]">
        <HealthDonutChart data={healthData} />
      </TabsContent>
      <TabsContent value="status" className="h-[calc(100%-40px)]">
        <HealthBarChart data={statusData} />
      </TabsContent>
    </Tabs>
  );
}

function HealthDonutChart({ data }: { data: HealthDataPoint[] }) {
  const filteredData = data
    .filter((d) => d.value > 0)
    .map((d) => ({
      name: HEALTH_LABELS[d.name] || d.name,
      value: d.value,
      fill: d.fill,
    }));

  if (filteredData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={renderSliceLabel}
            labelLine={false}
            fontSize={11}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D7DCE3",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(16, 24, 40, 0.08)",
              fontSize: "12px",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [(value as number).toLocaleString(), ""]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(label: any) => (typeof label === "string" ? HEALTH_LABELS[label] || label : String(label))}
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
    </div>
  );
}

function renderSliceLabel({
  value,
  percent,
  x,
  y,
}: {
  value?: number;
  percent?: number;
  x?: number;
  y?: number;
}) {
  const angle = (percent ?? 0) * 100;

  // Skip labels for very thin slices to avoid overlap — the Legend and
  // Tooltip still report their counts.
  if (angle < 5) return null;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="#1F2937"
      style={{ fontSize: 10, fontWeight: 600 }}
    >
      {`${value ?? 0} (${((percent ?? 0) * 100).toFixed(0)}%)`}
    </text>
  );
}

function HealthBarChart({ data }: { data: HealthDataPoint[] }) {
  const filteredData = data.filter((d) => d.value > 0);

  if (filteredData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filteredData} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#667085" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#667085" }}
            axisLine={{ stroke: "#D7DCE3" }}
            tickLine={false}
            width={80}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tickFormatter={(value: any) => (typeof value === "string" ? HEALTH_LABELS[value] || value : String(value))}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #D7DCE3",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(16, 24, 40, 0.08)",
              fontSize: "12px",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [(value as number).toLocaleString(), ""]}
            labelStyle={{ color: "#17202A", fontWeight: 600 }}
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