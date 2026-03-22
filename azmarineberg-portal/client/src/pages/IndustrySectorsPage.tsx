import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import TableWrapper from '../components/TableWrapper';

interface IndustrySector {
  id: string;
  name: string;
  code: string;
}

export default function IndustrySectorsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IndustrySector | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IndustrySector | null>(null);

  const canEdit = user?.role === 'super_admin';

  const { data: sectors, isLoading } = useQuery({
    queryKey: ['industry-sectors'],
    queryFn: () => api.get<IndustrySector[]>('/admin/industry-sectors'),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; code: string }) =>
      api.post<IndustrySector>('/admin/industry-sectors', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-sectors'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; code: string } }) =>
      api.put<IndustrySector>(`/admin/industry-sectors/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-sectors'] });
      setShowModal(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/industry-sectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industry-sectors'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (s: IndustrySector) => {
    setEditing(s);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Industry Sectors</h2>
        {canEdit && (
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Add Industry Sector
          </button>
        )}
      </div>

      <IndustrySectorModal
        open={showModal}
        onClose={closeModal}
        sector={editing}
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

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : !sectors?.length ? (
          <div className="p-8 text-center text-gray-500">No industry sectors. Add one to get started.</div>
        ) : (
          <TableWrapper>
            <table className="min-w-full">
              <thead className="table-thead">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Code</th>
                  {canEdit && (
                    <th className="table-th">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="table-tbody">
                {sectors.map((s) => (
                  <tr key={s.id}>
                    <td className="table-td font-medium">{s.name}</td>
                    <td className="table-td">{s.code}</td>
                    {canEdit && (
                      <td className="table-td flex gap-2">
                        <button onClick={() => openEdit(s)} className="text-primary hover:underline">
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
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
          </TableWrapper>
        )}
      </div>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        message={deleteTarget ? `Delete ${deleteTarget.name}?` : ''}
        warning="This will fail if companies use this sector."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function IndustrySectorModal({
  open,
  onClose,
  sector,
  onSubmit,
  error,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  sector: IndustrySector | null;
  onSubmit: (data: { name: string; code: string }) => void;
  error: string;
  loading: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (open) {
      setName(sector?.name ?? '');
      setCode(sector?.code ?? '');
    }
  }, [open, sector]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    onSubmit({ name: name.trim(), code: code.trim().toUpperCase() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {sector ? 'Edit Industry Sector' : 'Add Industry Sector'}
          </h3>
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
              placeholder="e.g. Manufacturing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code *</label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g. MFG"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? 'Saving...' : sector ? 'Update' : 'Add'}
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
