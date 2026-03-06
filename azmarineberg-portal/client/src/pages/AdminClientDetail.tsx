import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AddServiceModal from '../components/AddServiceModal';
import AddFacilityModal from '../components/AddFacilityModal';
import { useState } from 'react';

interface ClientDetail {
  id: string;
  company_name: string;
  email: string;
  phone?: string;
  contact_person: string;
  address: string;
  lga?: string;
  state?: string;
  zone?: string;
  industry_sector?: string;
  facilities: { id: string; facility_name: string; facility_address: string }[];
  services: {
    id: string;
    service_code: string;
    regulator_name: string;
    service_type_name: string;
    facility_name: string;
    validity_end: string;
    status: string;
  }[];
}

export default function AdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAddService, setShowAddService] = useState(false);
  const [showAddFacility, setShowAddFacility] = useState(false);

  const canAddService = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'staff';
  const canAddFacility = canAddService;

  const { data: client, isLoading, refetch } = useQuery({
    queryKey: ['client-detail', id],
    queryFn: () => api.get<ClientDetail>(`/admin/clients/${id}`),
    enabled: !!id,
  });

  if (isLoading || !client) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/clients')} className="text-primary hover:underline">
          ← Back to Clients
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-4">{client.company_name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm items-start">
              <p className="text-gray-600"><span className="font-bold text-gray-800">Email:</span> {client.email}</p>
              {client.phone && <p className="text-gray-600"><span className="font-bold text-gray-800">Phone:</span> {client.phone}</p>}
              <p className="text-gray-600"><span className="font-bold text-gray-800">Contact Person:</span> {client.contact_person}</p>
              <p className="text-gray-600"><span className="font-bold text-gray-800">Address:</span> {client.address}</p>
              {client.lga && <p className="text-gray-600"><span className="font-bold text-gray-800">LGA:</span> {client.lga}</p>}
              {client.state && <p className="text-gray-600"><span className="font-bold text-gray-800">State:</span> {client.state}</p>}
              {client.zone && <p className="text-gray-600"><span className="font-bold text-gray-800">Zone:</span> {client.zone}</p>}
              {client.industry_sector && <p className="text-gray-600"><span className="font-bold text-gray-800">Sector:</span> {client.industry_sector}</p>}
            </div>
          </div>
          {canAddService && client.facilities?.length > 0 && (
            <button
              onClick={() => setShowAddService(true)}
              className="flex-shrink-0 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Add Service
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Facilities ({client.facilities?.length ?? 0})</h3>
          {canAddFacility && (
            <button
              onClick={() => setShowAddFacility(true)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark text-sm"
            >
              Add Facility
            </button>
          )}
        </div>
        <div className="p-6">
          {!client.facilities?.length ? (
            <p className="text-gray-500">
              No facilities yet. {canAddFacility ? 'Click "Add Facility" to create one.' : 'Add a facility via create client flow.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {client.facilities.map((f) => (
                <li key={f.id} className="flex justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{f.facility_name}</span>
                    {f.facility_address && <p className="text-sm text-gray-500">{f.facility_address}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <h3 className="px-6 py-4 border-b text-lg font-semibold">Services ({client.services?.length ?? 0})</h3>
        <div className="overflow-x-auto">
          {!client.services?.length ? (
            <p className="p-6 text-gray-500">No services yet. Click &quot;Add Service&quot; to create one.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Service</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Regulator</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Facility</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Valid Until</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {client.services.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <span className="font-medium">{s.service_type_name ?? s.service_code}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">{s.regulator_name ?? '-'}</td>
                    <td className="px-6 py-4 text-sm">{s.facility_name ?? '-'}</td>
                    <td className="px-6 py-4 text-sm">{new Date(s.validity_end).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 capitalize">{s.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <Link to={`/services/${s.id}`} className="text-primary hover:underline">Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddServiceModal
        open={showAddService}
        onClose={() => setShowAddService(false)}
        onSuccess={() => refetch()}
        companyId={client.id}
        facilities={client.facilities ?? []}
      />
      <AddFacilityModal
        open={showAddFacility}
        onClose={() => setShowAddFacility(false)}
        onSuccess={() => refetch()}
        companyId={client.id}
        companyAddress={client.address}
        companyLga={client.lga}
        companyState={client.state}
        companyZone={client.zone}
      />
    </div>
  );
}
