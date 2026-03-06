import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ZONES, getStatesByZone, getLgasByState } from '../data/nigerianLocations';

interface AddFacilityModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  companyAddress?: string;
  companyLga?: string;
  companyState?: string;
  companyZone?: string;
}

export default function AddFacilityModal({
  open,
  onClose,
  onSuccess,
  companyId,
  companyAddress = '',
  companyLga = '',
  companyState = '',
  companyZone = '',
}: AddFacilityModalProps) {
  const [facility_name, setFacilityName] = useState('');
  const [facility_address, setFacilityAddress] = useState('');
  const [lga, setLga] = useState('');
  const [state, setState] = useState('');
  const [zone, setZone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFacilityName('');
      setFacilityAddress(companyAddress);
      setZone(companyZone || 'South-West');
      setState(companyState);
      setLga(companyLga);
    }
  }, [open, companyAddress, companyLga, companyState, companyZone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/admin/clients/${companyId}/facilities`, {
        facility_name: facility_name.trim(),
        facility_address: facility_address.trim(),
        lga: lga || state || undefined,
        state: state || undefined,
        zone: zone || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add facility');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Add Facility</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium mb-1">Facility Name *</label>
            <input
              required
              value={facility_name}
              onChange={(e) => setFacilityName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g. Main Office"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Facility Address *</label>
            <input
              required
              value={facility_address}
              onChange={(e) => setFacilityAddress(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="Full address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Zone</label>
            <select
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setState('');
                setLga('');
              }}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Select</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setLga('');
              }}
              disabled={!zone}
              className="w-full px-3 py-2 border rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{zone ? 'Select' : 'Select zone first'}</option>
              {[
                ...getStatesByZone(zone),
                ...(state && !getStatesByZone(zone).includes(state) ? [state] : []),
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">LGA</label>
            {state === 'Other' ? (
              <input
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                placeholder="Enter LGA"
                className="w-full px-3 py-2 border rounded"
              />
            ) : (
              <select
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                disabled={!state}
                className="w-full px-3 py-2 border rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">{state ? 'Select' : 'Select state first'}</option>
                {[
                  ...getLgasByState(state),
                  ...(lga && !getLgasByState(state).includes(lga) ? [lga] : []),
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Facility'}
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
