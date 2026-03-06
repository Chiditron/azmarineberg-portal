import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface Service {
  id: string;
  service_code: string;
  service_description: string;
  validity_end: string;
  status: string;
  regulator: { name: string; code: string };
  service_type: { name: string; code: string };
  facility: { facility_name: string };
  days_to_expiry: number;
}

function getExpiryColor(days: number) {
  if (days > 30) return 'text-regulatory-green';
  if (days > 7) return 'text-regulatory-amber';
  return 'text-regulatory-red';
}

export default function ClientServicesPage() {
  const { data: services, isLoading } = useQuery({
    queryKey: ['client-services'],
    queryFn: () => api.get<Service[]>('/clients/services'),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Your Services</h2>

      <div className="bg-white rounded-lg shadow">
        <h3 className="px-6 py-4 border-b text-lg font-semibold">Services</h3>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 animate-pulse">
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          ) : !services?.length ? (
            <p className="p-6 text-gray-500">No services yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Service</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Regulator</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Facility</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Expiry</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <span className="font-medium">{s.service_type?.name ?? s.service_code}</span>
                      <p className="text-sm text-gray-500 truncate max-w-xs">{s.service_description}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">{s.regulator?.name ?? '-'}</td>
                    <td className="px-6 py-4 text-sm">{s.facility?.facility_name ?? '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 capitalize">
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${getExpiryColor(s.days_to_expiry ?? 999)}`}>
                      {s.validity_end
                        ? s.days_to_expiry !== undefined
                          ? `${s.days_to_expiry} days`
                          : new Date(s.validity_end).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link to={`/services/${s.id}`} className="text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
