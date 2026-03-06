import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';

interface Regulator {
  id: string;
  name: string;
  code: string;
  level: string;
}

interface ServiceType {
  id: string;
  name: string;
  code: string;
  regulator_id: string;
  regulator_name?: string;
}

export default function ServiceTypesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceType | null>(null);
  const [filterRegulator, setFilterRegulator] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'super_admin';

  const { data: regulators } = useQuery({
    queryKey: ['regulators'],
    queryFn: () => api.get<Regulator[]>('/admin/regulators'),
  });

  const { data: serviceTypes, isLoading } = useQuery({
    queryKey: ['service-types', filterRegulator],
    queryFn: () =>
      api.get<ServiceType[]>(
        filterRegulator ? `/admin/service-types?regulatorId=${filterRegulator}` : '/admin/service-types'
      ),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; code: string; regulator_id: string }) =>
      api.post<ServiceType>('/admin/service-types', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name: string; code: string; regulator_id: string };
    }) => api.put<ServiceType>(`/admin/service-types/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      setShowModal(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/service-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (st: ServiceType) => {
    setEditing(st);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Service Types</h2>
        <div className="flex gap-2 items-center">
          <select
            value={filterRegulator}
            onChange={(e) => setFilterRegulator(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All regulators</option>
            {regulators?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
          {canEdit && (
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Add Service Type
            </button>
          )}
        </div>
      </div>

      <ServiceTypeModal
        open={showModal}
        onClose={closeModal}
        serviceType={editing}
        regulators={regulators ?? []}
        onSubmit={(data) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, body: data });
          } else {
            createMutation.mutate(data);
          }
        }}
        error={
          createMutation.error instanceof Error
            ? createMutation.error.message
            : updateMutation.error instanceof Error
              ? updateMutation.error.message
              : ''
        }
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : !serviceTypes?.length ? (
          <div className="p-8 text-center text-gray-500">
            No service types. Add one to get started.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Regulator</th>
                {canEdit && (
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {serviceTypes.map((st) => (
                <tr key={st.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{st.name}</td>
                  <td className="px-6 py-4 text-sm">{st.code}</td>
                  <td className="px-6 py-4 text-sm">{st.regulator_name ?? '-'}</td>
                  {canEdit && (
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button onClick={() => openEdit(st)} className="text-primary hover:underline">
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(st)}
                        className="text-red-600 hover:underline"
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        message={deleteTarget ? `Delete ${deleteTarget.name}?` : ''}
        warning="This will fail if it is used by any services."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function ServiceTypeModal({
  open,
  onClose,
  serviceType,
  regulators,
  onSubmit,
  error,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  serviceType: ServiceType | null;
  regulators: Regulator[];
  onSubmit: (data: { name: string; code: string; regulator_id: string }) => void;
  error: string;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [regulator_id, setRegulatorId] = useState('');

  useEffect(() => {
    if (open) {
      setName(serviceType?.name ?? '');
      setCode(serviceType?.code ?? '');
      setRegulatorId(serviceType?.regulator_id ?? regulators[0]?.id ?? '');
    }
  }, [open, serviceType, regulators]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !regulator_id) return;
    onSubmit({ name: name.trim(), code: code.trim().toUpperCase(), regulator_id });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {serviceType ? 'Edit Service Type' : 'Add Service Type'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Regulator *</label>
            <select
              required
              value={regulator_id}
              onChange={(e) => setRegulatorId(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Select regulator</option>
              {regulators.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g. Air Quality Monitoring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code *</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g. AQM"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? 'Saving...' : serviceType ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
