import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface ReportRow {
  facility: string;
  address: string;
  sector: string;
  service: string;
  regulator: string;
  status: string;
}

interface FacilityOption {
  id: string;
  facility_name: string;
  company_name: string;
}

interface SectorOption {
  id: string;
  name: string;
  code: string;
}

interface ServiceTypeOption {
  id: string;
  name: string;
  code: string;
}

interface RegulatorOption {
  id: string;
  name: string;
  code: string;
}

const PAGE_SIZES = [25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'report_preparation', label: 'Report Preparation' },
  { value: 'submission', label: 'Submission' },
  { value: 'approved', label: 'Approved' },
  { value: 'closed', label: 'Closed' },
];

function buildReportParams(
  page: number,
  pageSize: number,
  facilityId: string,
  sectorId: string,
  serviceTypeId: string,
  regulatorId: string,
  status: string
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('limit', String(pageSize));
  params.set('offset', String(page * pageSize));
  if (facilityId) params.set('facility_id', facilityId);
  if (sectorId) params.set('sector', sectorId);
  if (serviceTypeId) params.set('service_type_id', serviceTypeId);
  if (regulatorId) params.set('regulator_id', regulatorId);
  if (status) params.set('status', status);
  return params;
}

function buildExportParams(
  format: string,
  facilityId: string,
  sectorId: string,
  serviceTypeId: string,
  regulatorId: string,
  status: string
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('format', format);
  if (facilityId) params.set('facility_id', facilityId);
  if (sectorId) params.set('sector', sectorId);
  if (serviceTypeId) params.set('service_type_id', serviceTypeId);
  if (regulatorId) params.set('regulator_id', regulatorId);
  if (status) params.set('status', status);
  return params;
}

export default function ReportPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [facilityId, setFacilityId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [regulatorId, setRegulatorId] = useState('');
  const [status, setStatus] = useState('');

  const params = buildReportParams(
    page,
    pageSize,
    facilityId,
    sectorId,
    serviceTypeId,
    regulatorId,
    status
  );

  const { data, isLoading } = useQuery({
    queryKey: ['report', page, pageSize, facilityId, sectorId, serviceTypeId, regulatorId, status],
    queryFn: () =>
      api.get<{ rows: ReportRow[]; total: number }>(`/admin/report?${params.toString()}`),
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => api.get<FacilityOption[]>('/admin/facilities'),
  });

  const { data: sectors = [] } = useQuery({
    queryKey: ['industry-sectors'],
    queryFn: () => api.get<SectorOption[]>('/admin/industry-sectors'),
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ['service-types'],
    queryFn: () => api.get<ServiceTypeOption[]>('/admin/service-types'),
  });

  const { data: regulators = [] } = useQuery({
    queryKey: ['regulators'],
    queryFn: () => api.get<RegulatorOption[]>('/admin/regulators'),
  });

  const total = data?.total ?? 0;
  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const resetPage = useCallback(() => setPage(0), []);

  const handleExport = useCallback(
    async (format: 'csv' | 'excel' | 'pdf') => {
      const ext = format === 'excel' ? 'xlsx' : format;
      const q = buildExportParams(
        format === 'excel' ? 'excel' : format,
        facilityId,
        sectorId,
        serviceTypeId,
        regulatorId,
        status
      );
      const blob = await api.downloadBlob(`/admin/report/export?${q.toString()}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [facilityId, sectorId, serviceTypeId, regulatorId, status]
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Report</h2>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Facility</label>
            <select
              value={facilityId}
              onChange={(e) => {
                setFacilityId(e.target.value);
                resetPage();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.facility_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Sector</label>
            <select
              value={sectorId}
              onChange={(e) => {
                setSectorId(e.target.value);
                resetPage();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Service</label>
            <select
              value={serviceTypeId}
              onChange={(e) => {
                setServiceTypeId(e.target.value);
                resetPage();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              {serviceTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Regulator</label>
            <select
              value={regulatorId}
              onChange={(e) => {
                setRegulatorId(e.target.value);
                resetPage();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              {regulators.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                resetPage();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport('excel')}
            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Facility
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Sector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Regulator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                        No records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{row.facility}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.address}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.sector}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.service}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{row.regulator}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                          {row.status.replace(/_/g, ' ')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
                {total > 0 && ` (${total} total)`}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
