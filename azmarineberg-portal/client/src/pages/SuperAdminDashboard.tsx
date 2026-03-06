import { useQuery } from '@tanstack/react-query';
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
} from 'recharts';
import { api } from '../services/api';

function RegulatorTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { code: string; count: number };
  return (
    <div className="rounded border border-gray-200 bg-white px-3 py-2 shadow-sm text-sm">
      <p className="font-medium text-gray-700">{row.code}</p>
      <p className="text-gray-600">Count: {row.count}</p>
    </div>
  );
}

const CHART_COLORS = ['#0d5c2e', '#1e40af', '#d97706', '#dc2626', '#7c3aed', '#0e7490'];

interface DashboardMetrics {
  totalCompanies: number;
  activeServices: number;
  completedServices: number;
  expiringServices: number;
  byRegulator?: { code: string; name: string; count: number }[];
  bySector?: { sector: string; count: number }[];
}

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['super-dashboard'],
    queryFn: () => api.get<DashboardMetrics>('/dashboard/metrics'),
  });

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-gray-200 rounded-lg" />;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Intelligence</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Companies</p>
          <p className="text-2xl font-bold text-primary">{data?.totalCompanies ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Active Services</p>
          <p className="text-2xl font-bold text-primary">{data?.activeServices ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-gray-900">{data?.completedServices ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Expiring Soon</p>
          <p className="text-2xl font-bold text-regulatory-amber">{data?.expiringServices ?? 0}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Services by Regulator</h3>
          {data?.byRegulator?.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byRegulator}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip content={<RegulatorTooltip />} />
                  <Bar dataKey="count" fill={CHART_COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Services by Sector</h3>
          {data?.bySector?.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.bySector}
                    dataKey="count"
                    nameKey="sector"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {data.bySector.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}

