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

export default function RegulatorsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Regulator | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Regulator | null>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'super_admin';

  const { data: regulators, isLoading } = useQuery({
    queryKey: ['regulators'],
    queryFn: () => api.get<Regulator[]>('/admin/regulators'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; code: string; level: string }) =>
      api.post<Regulator>('/admin/regulators', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulators'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; code: string; level: string } }) =>
      api.put<Regulator>(`/admin/regulators/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulators'] });
      setShowModal(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/regulators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulators'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (r: Regulator) => {
    setEditing(r);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Regulators</h2>
        {canEdit && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Add Regulator
          </button>
        )}
      </div>

      <RegulatorModal
        open={showModal}
        onClose={closeModal}
        regulator={editing}
        onSubmit={(data) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, body: data });
          } else {
            createMutation.mutate(data);
          }
        }}
        error={createMutation.error instanceof Error ? createMutation.error.message : updateMutation.error instanceof Error ? updateMutation.error.message : ''}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : !regulators?.length ? (
          <div className="p-8 text-center text-gray-500">No regulators. Add one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Level</th>
                {canEdit && (
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {regulators.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{r.name}</td>
                  <td className="px-6 py-4 text-sm">{r.code}</td>
                  <td className="px-6 py-4 text-sm capitalize">{r.level}</td>
                  {canEdit && (
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button onClick={() => openEdit(r)} className="text-primary hover:underline">
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
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
          </div>
        )}
      </div>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        message={deleteTarget ? `Delete ${deleteTarget.name}?` : ''}
        warning="This will fail if it has service types."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function RegulatorModal({
  open,
  onClose,
  regulator,
  onSubmit,
  error,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  regulator: Regulator | null;
  onSubmit: (data: { name: string; code: string; level: string }) => void;
  error: string;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState('federal');

  useEffect(() => {
    if (open) {
      setName(regulator?.name ?? '');
      setCode(regulator?.code ?? '');
      setLevel(regulator?.level ?? 'federal');
    }
  }, [open, regulator]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    onSubmit({ name: name.trim(), code: code.trim().toUpperCase(), level });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{regulator ? 'Edit Regulator' : 'Add Regulator'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g. National Environmental Standards..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code *</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g. NESREA"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Level *</label>
            <select
              required
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="federal">Federal</option>
              <option value="state">State</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? 'Saving...' : regulator ? 'Update' : 'Add'}
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
