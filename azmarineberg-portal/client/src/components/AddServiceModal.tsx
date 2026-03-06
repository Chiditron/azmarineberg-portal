import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface Facility {
  id: string;
  facility_name: string;
  facility_address: string;
}

interface Regulator {
  id: string;
  name: string;
  code: string;
}

interface ServiceType {
  id: string;
  name: string;
  code: string;
  regulator_id: string;
}

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  facilities: Facility[];
}

export default function AddServiceModal({ open, onClose, onSuccess, companyId, facilities }: AddServiceModalProps) {
  const [facility_id, setFacilityId] = useState('');
  const [service_type_id, setServiceTypeId] = useState('');
  const [regulator_id, setRegulatorId] = useState('');
  const [service_description, setServiceDescription] = useState('');
  const [validity_start, setValidityStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [validity_end, setValidityEnd] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: regulators } = useQuery({
    queryKey: ['regulators'],
    queryFn: () => api.get<Regulator[]>('/admin/regulators'),
  });

  const { data: serviceTypes } = useQuery({
    queryKey: ['service-types', regulator_id],
    queryFn: () => api.get<ServiceType[]>(`/admin/service-types?regulatorId=${regulator_id}`),
    enabled: !!regulator_id,
  });

  useEffect(() => {
    if (facilities?.length && !facility_id) setFacilityId(facilities[0].id);
  }, [facilities, facility_id]);

  useEffect(() => {
    if (regulator_id) setServiceTypeId('');
  }, [regulator_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const st = serviceTypes?.find((s) => s.id === service_type_id);
      await api.post('/admin/services', {
        facility_id,
        company_id: companyId,
        service_type_id,
        regulator_id,
        service_description: service_description || (st?.name ?? ''),
        service_code: st?.code ?? 'N/A',
        validity_start,
        validity_end,
        status: 'draft',
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add Service</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Facility *</label>
            <select required value={facility_id} onChange={(e) => setFacilityId(e.target.value)} className="w-full px-3 py-2 border rounded">
              <option value="">Select facility</option>
              {facilities?.map((f) => (
                <option key={f.id} value={f.id}>{f.facility_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Regulator *</label>
            <select required value={regulator_id} onChange={(e) => setRegulatorId(e.target.value)} className="w-full px-3 py-2 border rounded">
              <option value="">Select regulator</option>
              {regulators?.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Service Type *</label>
            <select required value={service_type_id} onChange={(e) => setServiceTypeId(e.target.value)} className="w-full px-3 py-2 border rounded" disabled={!regulator_id}>
              <option value="">Select regulator first</option>
              {serviceTypes?.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={service_description} onChange={(e) => setServiceDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded" placeholder="Brief service description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Valid From *</label>
              <input type="date" required value={validity_start} onChange={(e) => setValidityStart(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valid Until *</label>
              <input type="date" required value={validity_end} onChange={(e) => setValidityEnd(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50">
              {loading ? 'Adding...' : 'Add Service'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
