import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import TableWrapper from '../components/TableWrapper';

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

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <h3 className="px-6 py-4 border-b border-gray-200 text-lg font-semibold">Services</h3>
        {isLoading ? (
          <div className="p-6 animate-pulse">
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        ) : !services?.length ? (
          <p className="p-6 text-gray-500">No services yet.</p>
        ) : (
          <TableWrapper>
            <table className="min-w-full">
              <thead className="table-thead">
                <tr>
                  <th className="table-th">Service</th>
                  <th className="table-th">Regulator</th>
                  <th className="table-th">Facility</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Expiry</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody className="table-tbody">
                {services.map((s) => (
                  <tr key={s.id}>
                    <td className="table-td">
                      <span className="font-medium">{s.service_type?.name ?? s.service_code}</span>
                      <p className="text-sm text-gray-500 break-words">{s.service_description}</p>
                    </td>
                    <td className="table-td">{s.regulator?.name ?? '-'}</td>
                    <td className="table-td">{s.facility?.facility_name ?? '-'}</td>
                    <td className="table-td">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 capitalize">
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`table-td font-medium ${getExpiryColor(s.days_to_expiry ?? 999)}`}>
                      {s.validity_end
                        ? s.days_to_expiry !== undefined
                          ? `${s.days_to_expiry} days`
                          : new Date(s.validity_end).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="table-td">
                      <Link to={`/services/${s.id}`} className="text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrapper>
        )}
      </div>
    </div>
  );
}
