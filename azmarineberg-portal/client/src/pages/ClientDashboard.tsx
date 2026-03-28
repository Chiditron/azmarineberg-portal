import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface DashboardStats {
  activeServices: number;
  completedServices: number;
  expiringSoon: number;
  pendingReports: number;
}

export default function ClientDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['client-dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/clients/dashboard/stats'),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Dashboard</h2>

      {isLoading ? (
        <div className="animate-pulse flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Active Services</p>
            <p className="text-2xl mt-4 font-bold text-primary">{stats?.activeServices ?? 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl mt-4 font-bold text-gray-900">{stats?.completedServices ?? 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Expiring Soon</p>
            <p className="text-2xl mt-4 font-bold text-regulatory-amber">{stats?.expiringSoon ?? 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Pending Reports</p>
            <p className="text-2xl mt-4 font-bold text-gray-900">{stats?.pendingReports ?? 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
