import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  TooltipProps,
} from "recharts";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import DashboardCard from "../components/ui/DashboardCard";
import {
  faBuilding,
  faBriefcase,
  faCheckCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

function RegulatorTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { code: string; count: number };
  return (
    <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg font-lato text-sm">
      <p className="font-bold text-gray-900 mb-1">{row.code}</p>
      <p className="text-primary font-medium">Count: {row.count}</p>
    </div>
  );
}

const CHART_COLORS = [
  "#0d5c2e",
  "#1e40af",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0e7490",
];

interface DashboardMetrics {
  totalCompanies: number;
  activeServices: number;
  completedServices: number;
  expiringServices: number;
  byRegulator?: { code: string; name: string; count: number }[];
  bySector?: { sector: string; count: number }[];
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["super-dashboard"],
    queryFn: () => api.get<DashboardMetrics>("/dashboard/metrics"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 font-poppins">
          Welcome {user?.firstName ?? ""}
        </h2>
        <p className="text-gray-500 mt-1 font-medium font-lato">
          Overview of company registrations and regulatory service performance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <DashboardCard
          title="Total Companies"
          value={data?.totalCompanies ?? 0}
          icon={faBuilding}
        />
        <DashboardCard
          title="Active Services"
          value={data?.activeServices ?? 0}
          icon={faBriefcase}
        />
        <DashboardCard
          title="Completed"
          value={data?.completedServices ?? 0}
          icon={faCheckCircle}
          iconColor="text-green-500"
        />
        <DashboardCard
          title="Expiring Soon"
          value={data?.expiringServices ?? 0}
          icon={faExclamationTriangle}
          iconColor="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-8 rounded-2xl border border-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-8 font-poppins">
            Services by Regulator
          </h3>
          {data?.byRegulator?.length ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byRegulator}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis
                    dataKey="code"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9ca3af", fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#9ca3af", fontWeight: 500 }}
                  />
                  <Tooltip
                    content={<RegulatorTooltip />}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#0d5c2e"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400 font-medium">
              No data available
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-8 font-poppins">
            Distribution by Sector
          </h3>
          {data?.bySector?.length ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.bySector}
                    dataKey="count"
                    nameKey="sector"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    label
                  >
                    {data.bySector.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-400 font-medium">
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
