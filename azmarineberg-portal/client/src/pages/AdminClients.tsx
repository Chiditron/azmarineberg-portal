import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CreateClientModal from '../components/CreateClientModal';

interface Company {
  id: string;
  company_name: string;
  email: string;
  contact_person: string;
  state: string;
  zone: string;
  industry_sector: string;
  facility_count: number;
  service_count: number;
}

export default function AdminClients() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const canCreate = user?.role === 'admin' || user?.role === 'super_admin';

  const { data: clients, isLoading, refetch } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => api.get<Company[]>('/admin/clients'),
  });

  const filtered = clients?.filter(
    (c) =>
      !search ||
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
        <div className="flex gap-2">
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Add Client
            </button>
          )}
          <input
          type="search"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md w-64"
          />
        </div>
      </div>
      <CreateClientModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => refetch()}
      />
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : !filtered?.length ? (
          <div className="p-8 text-center text-gray-500">No clients found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Company</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">State / Zone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Sector</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Facilities</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Services</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    <span className="font-medium">{c.company_name}</span>
                    <p className="text-sm text-gray-500">{c.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">{c.contact_person}</td>
                  <td className="px-6 py-4 text-sm">{c.state} / {c.zone}</td>
                  <td className="px-6 py-4 text-sm">{c.industry_sector}</td>
                  <td className="px-6 py-4 text-sm">{c.facility_count ?? 0}</td>
                  <td className="px-6 py-4 text-sm">{c.service_count ?? 0}</td>
                  <td className="px-6 py-4 text-sm">
                    <Link to={`/admin/clients/${c.id}`} className="text-primary hover:underline">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
