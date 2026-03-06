import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface CompanyDetails {
  company_name: string;
  email: string;
  phone?: string;
  contact_person: string;
  address: string;
  lga?: string;
  state?: string;
  zone?: string;
  industry_sector?: string;
  facilities: { id: string; facility_name: string; facility_address: string; lga?: string; state?: string; zone?: string }[];
}

export default function ClientProfilePage() {
  const { data: company, isLoading } = useQuery({
    queryKey: ['client-company'],
    queryFn: () => api.get<CompanyDetails>('/clients/company'),
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>
        <div className="animate-pulse h-48 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>
        <p className="text-gray-500">No company details found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Profile</h2>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">{company.company_name}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm items-start">
          <p className="text-gray-600"><span className="font-bold text-gray-800">Email:</span> {company.email}</p>
          {company.phone && <p className="text-gray-600"><span className="font-bold text-gray-800">Phone:</span> {company.phone}</p>}
          <p className="text-gray-600"><span className="font-bold text-gray-800">Contact Person:</span> {company.contact_person}</p>
          <p className="text-gray-600"><span className="font-bold text-gray-800">Address:</span> {company.address}</p>
          {company.lga && <p className="text-gray-600"><span className="font-bold text-gray-800">LGA:</span> {company.lga}</p>}
          {company.state && <p className="text-gray-600"><span className="font-bold text-gray-800">State:</span> {company.state}</p>}
          {company.zone && <p className="text-gray-600"><span className="font-bold text-gray-800">Zone:</span> {company.zone}</p>}
          {company.industry_sector && <p className="text-gray-600"><span className="font-bold text-gray-800">Sector:</span> {company.industry_sector}</p>}
        </div>
        {company.facilities?.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-semibold text-gray-800 mb-2">Facilities ({company.facilities.length})</h4>
            <div className="space-y-2">
              {company.facilities.map((f) => (
                <div key={f.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-900">{f.facility_name}</p>
                  <p className="text-sm text-gray-600">{f.facility_address}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
