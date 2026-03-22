import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CreateClientModal from '../components/CreateClientModal';
import TableWrapper from '../components/TableWrapper';

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
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
        <div className="flex flex-wrap gap-2 items-center min-w-0">
          {canCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark shrink-0"
            >
              Add Client
            </button>
          )}
          <input
            type="search"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md w-64 min-w-0"
          />
        </div>
      </div>
      <CreateClientModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => refetch()}
      />
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : !filtered?.length ? (
          <div className="p-8 text-center text-gray-500">No clients found.</div>
        ) : (
          <TableWrapper>
            <table className="min-w-full">
              <thead className="table-thead">
                <tr>
                  <th className="table-th">Company</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th">State / Zone</th>
                  <th className="table-th">Sector</th>
                  <th className="table-th">Facilities</th>
                  <th className="table-th">Services</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody className="table-tbody">
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="table-td">
                      <span className="font-medium">{c.company_name}</span>
                      <p className="text-sm text-gray-500">{c.email}</p>
                    </td>
                    <td className="table-td">{c.contact_person}</td>
                    <td className="table-td">{c.state} / {c.zone}</td>
                    <td className="table-td">{c.industry_sector}</td>
                    <td className="table-td">{c.facility_count ?? 0}</td>
                    <td className="table-td">{c.service_count ?? 0}</td>
                    <td className="table-td">
                      <Link to={`/admin/clients/${c.id}`} className="text-primary hover:underline">
                        Manage
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
