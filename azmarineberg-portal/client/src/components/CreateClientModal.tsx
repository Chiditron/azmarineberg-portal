import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ZONES, getStatesByZone, getLgasByState } from '../data/nigerianLocations';

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
}

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateClientModal({ open, onClose, onSuccess }: CreateClientModalProps) {
  const [company_name, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contact_person, setContactPerson] = useState('');
  const [lga, setLga] = useState('');
  const [state, setState] = useState('');
  const [zone, setZone] = useState('');
  const [industry_sector_id, setIndustrySectorId] = useState('');
  const [facilities, setFacilities] = useState([{ facility_name: '', facility_address: '', lga: '', state: '', zone: '' }]);
  const [createUserAndInvite, setCreateUserAndInvite] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useQuery({
    queryKey: ['regulators'],
    queryFn: () => api.get<Regulator[]>('/admin/regulators'),
  });
  useQuery({
    queryKey: ['service-types'],
    queryFn: () => api.get<ServiceType[]>('/admin/service-types'),
  });
  const { data: industrySectors } = useQuery({
    queryKey: ['industry-sectors'],
    queryFn: () => api.get<{ id: string; name: string; code: string }[]>('/admin/industry-sectors'),
  });

  const addFacility = () => {
    setFacilities([...facilities, { facility_name: '', facility_address: '', lga: '', state: '', zone: '' }]);
  };
  const removeFacility = (i: number) => {
    if (facilities.length > 1) setFacilities(facilities.filter((_, idx) => idx !== i));
  };
  const updateFacility = (i: number, field: string, value: string) => {
    const next = [...facilities];
    (next[i] as Record<string, string>)[field] = value;
    setFacilities(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        company_name,
        address,
        phone,
        email,
        contact_person,
        lga: lga || state,
        state,
        zone,
        industry_sector_id: industry_sector_id || undefined,
        facilities: facilities.map((f) => ({
          facility_name: f.facility_name,
          facility_address: f.facility_address,
          lga: f.lga || state,
          state: f.state || state,
          zone: f.zone || zone,
        })),
        createUserAndInvite: createUserAndInvite ? true : false,
      };
      const res = await api.post<{ companyId: string; inviteLink?: string }>('/admin/clients', payload);
      if (res.inviteLink) {
        navigator.clipboard.writeText(res.inviteLink);
        alert(`Client created. Invite link copied to clipboard:\n${res.inviteLink}`);
      } else {
        alert('Client created successfully.');
      }
      onSuccess();
      onClose();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCompanyName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setContactPerson('');
    setLga('');
    setState('');
    setZone('');
    setIndustrySectorId('');
    setFacilities([{ facility_name: '', facility_address: '', lga: '', state: '', zone: '' }]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Create Client</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <input required value={company_name} onChange={(e) => setCompanyName(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone *</label>
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Address *</label>
              <input required value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zone *</label>
              <select
                required
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
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State *</label>
              <select
                required
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setLga('');
                }}
                disabled={!zone}
                className="w-full px-3 py-2 border rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">{zone ? 'Select' : 'Select zone first'}</option>
                {getStatesByZone(zone).map((s) => (
                  <option key={s} value={s}>{s}</option>
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
                  {getLgasByState(state).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Person *</label>
              <input required value={contact_person} onChange={(e) => setContactPerson(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Industry Sector *</label>
              <select required value={industry_sector_id} onChange={(e) => setIndustrySectorId(e.target.value)} className="w-full px-3 py-2 border rounded">
                <option value="">
                  {!industrySectors ? 'Loading...' : industrySectors.length === 0 ? 'No sectors configured' : 'Select'}
                </option>
                {industrySectors?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Facilities *</label>
              <button type="button" onClick={addFacility} className="text-sm text-primary">+ Add Facility</button>
            </div>
            {facilities.map((f, i) => (
              <div key={i} className="border rounded p-4 mb-2 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Facility {i + 1}</span>
                  {facilities.length > 1 && (
                    <button type="button" onClick={() => removeFacility(i)} className="text-red-600 text-sm">Remove</button>
                  )}
                </div>
                <input
                  required
                  placeholder="Facility Name"
                  value={f.facility_name}
                  onChange={(e) => updateFacility(i, 'facility_name', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <input
                  placeholder="Facility Address"
                  value={f.facility_address}
                  onChange={(e) => updateFacility(i, 'facility_address', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={createUserAndInvite} onChange={(e) => setCreateUserAndInvite(e.target.checked)} />
              Create user account and generate invite link
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Client'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
