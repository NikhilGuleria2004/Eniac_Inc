import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/Tabs";

interface DistributionDataPoint {
  name: string;
  value: number;
  fill: string;
}

interface EmployeeDistributionChartProps {
  countryData: DistributionDataPoint[];
  billingData: DistributionDataPoint[];
  employmentStatusData: DistributionDataPoint[];
}

export function EmployeeDistributionChart({ countryData, billingData, employmentStatusData }: EmployeeDistributionChartProps) {
  return (
    <Tabs defaultValue="country" className="w-full h-full">
      <TabsList className="grid w-full grid-cols-3 mb-3 bg-transparent">
        <TabsTrigger value="country" className="text-xs px-2 py-1">Country</TabsTrigger>
        <TabsTrigger value="billing" className="text-xs px-2 py-1">Billing</TabsTrigger>
        <TabsTrigger value="status" className="text-xs px-2 py-1">Employment Status</TabsTrigger>
      </TabsList>
      <TabsContent value="country" className="h-[calc(100%-40px)]">
        <DistributionDonutChart data={countryData} />
      </TabsContent>
      <TabsContent value="billing" className="h-[calc(100%-40px)]">
        <DistributionDonutChart data={billingData} />
      </TabsContent>
      <TabsContent value="status" className="h-[calc(100%-40px)]">
        <DistributionDonutChart data={employmentStatusData} />
      </TabsContent>
    </Tabs>
  );
}

function DistributionDonutChart({ data }: { data: DistributionDataPoint[] }) {
  const filteredData = data.filter((d) => d.value > 0);

  if (filteredData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <ResponsiveContainer width="100%" height="85%">
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
            label={(props: any) =>
              `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`
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
              backgroundColor: "#FFFFFF",
              border: "1px solid #D7DCE3",
              borderRadius: "6px",
              boxShadow: "0 2px 8px rgba(16, 24, 40, 0.08)",
              fontSize: "12px",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [(value as number).toLocaleString(), ""]}
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
          <div key={entry.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
            <span className="text-xs text-gray-600">{entry.name}: {entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}