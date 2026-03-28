import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import DocumentPreviewModal from '../components/DocumentPreviewModal';
import TableWrapper from '../components/TableWrapper';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'report_preparation', label: 'Report Preparation' },
  { value: 'submission', label: 'Submission' },
  { value: 'approved', label: 'Approved' },
  { value: 'closed', label: 'Closed' },
];

const DOCUMENT_TYPES = [
  { value: 'azmarineberg_upload', label: 'Report / Document' },
  { value: 'certificate', label: 'Regulator Certificate' },
  { value: 'acknowledged_submission', label: 'Acknowledged Submission' },
];

interface TimelineItem {
  status: string;
  label: string;
  completed: boolean;
  current: boolean;
  date?: string;
  notes?: string;
}

interface Document {
  id: string;
  file_name: string;
  version: number;
  document_type: string;
  created_at: string;
}

interface ServiceDetail {
  id: string;
  service_code: string;
  service_description: string;
  validity_end: string;
  status: string;
  regulator: { name: string; code: string };
  service_type: { name: string; code: string };
  facility: { facility_name: string };
  days_to_expiry: number;
  timeline: TimelineItem[];
}

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [statusNotes, setStatusNotes] = useState('');
  const [uploadDocType, setUploadDocType] = useState('azmarineberg_upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ id: string; fileName: string } | null>(null);

  const canUpdateStatus = user?.role && ['admin', 'staff', 'super_admin'].includes(user.role);
  const canUploadAsStaff = canUpdateStatus;

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', id],
    queryFn: () => api.get<ServiceDetail>(`/services/${id}`),
    enabled: !!id,
  });

  const { data: documents, refetch: refetchDocs } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => api.get<Document[]>(`/documents/service/${id}`),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (data: { status: string; notes?: string }) =>
      api.patch(`/services/${id}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service', id] });
    },
  });

  const getExpiryColor = (days: number) => {
    if (days > 30) return 'text-regulatory-green';
    if (days > 7) return 'text-regulatory-amber';
    return 'text-regulatory-red';
  };

  const handleDownload = async (docId: string) => {
    const { url } = await api.get<{ url: string }>(`/documents/${docId}/download-url`);
    if (url.includes('/api/documents/serve')) {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      URL.revokeObjectURL(blobUrl);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleStatusUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const status = (form.elements.namedItem('status') as HTMLSelectElement)?.value;
    if (status) statusMutation.mutate({ status, notes: statusNotes || undefined });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadError('');
    setUploading(true);
    try {
      if (canUploadAsStaff) {
        await api.uploadFile(`/documents/service/${id}/upload`, file, uploadDocType);
      } else {
        await api.uploadFile(`/documents/service/${id}/upload`, file);
      }
      refetchDocs();
      e.target.value = '';
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!service && !isLoading) return <div className="p-6">Loading...</div>;
  if (!service) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 font-semibold text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-all"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
          Back
        </button>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:justify-between md:items-start md:gap-6">
          <div className="min-w-0 flex-1">
            <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-10'>
              <div>
                <h2 className="text-xl font-semibold">{service.service_type?.name ?? service.service_code}</h2>
                <p className="mt-1 text-gray-600">{service.service_description}</p>
              </div>
              <div className="shrink-0 border-t border-gray-100 pt-4 md:border-t-0 md:border-l md:pl-6 md:pt-0 md:text-right">
                <p className={`text-lg font-semibold ${getExpiryColor(service.days_to_expiry ?? 999)}`}>
                  {service.days_to_expiry !== undefined ? `${service.days_to_expiry} days to expiry` : 'N/A'}
                </p>
                <p className="text-sm text-gray-500">
                  Valid until: {new Date(service.validity_end).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 md:mt-2 md:flex-row md:flex-wrap md:gap-x-4 md:gap-y-1 pt-4 border-t border-gray-100">
              <span className="block">
                <span className="font-medium text-gray-700">Regulator:</span>{' '}
                {service.regulator?.name ?? '-'}
              </span>
              <span className="block">
                <span className="font-medium text-gray-700">Facility:</span>{' '}
                {service.facility?.facility_name ?? '-'}
              </span>
            </div>
          </div>
        </div>

        {canUpdateStatus && (
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <h3 className="mb-3 font-semibold">Update Status</h3>
            <form
              onSubmit={handleStatusUpdate}
              className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end"
            >
              <div className="w-full min-w-0 md:w-auto">
                <label className="mb-1 block text-sm">Status</label>
                <select
                  name="status"
                  defaultValue={service.status}
                  className="w-full rounded border px-3 py-2 md:min-w-[180px]"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 flex-1 md:min-w-[200px]">
                <label className="mb-1 block text-sm">Notes (optional)</label>
                <input
                  type="text"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Site visit completed"
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <button
                type="submit"
                disabled={statusMutation.isPending}
                className="w-full shrink-0 rounded bg-primary px-4 py-2 text-white hover:bg-primary-dark disabled:opacity-50 md:w-auto"
              >
                {statusMutation.isPending ? 'Updating...' : 'Update'}
              </button>
            </form>
          </div>
        )}
        <div className='mt-6'>
          <h3 className="font-semibold mb-3">Status Timeline</h3>
          <div className="space-y-2">
            {service.timeline?.map((t) => (
              <div
                key={t.status}
                className={`flex items-center gap-3 p-2 rounded ${t.current ? 'bg-primary/10' : t.completed ? 'bg-gray-50' : 'bg-gray-100 opacity-60'
                  }`}
              >
                <span className={`w-3 h-3 rounded-full ${t.completed ? 'bg-primary' : 'bg-gray-300'
                  }`} />
                <span className="capitalize">{t.label}</span>
                {t.date && <span className="text-sm text-gray-500">{new Date(t.date).toLocaleDateString()}</span>}
              </div>
            ))}
          </div></div>

        <div className="bg-white rounded-lg shadow mt-6">
          <div className="px-6 py-4 border-b flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-semibold">Documents</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {canUploadAsStaff && (
                <select value={uploadDocType} onChange={(e) => setUploadDocType(e.target.value)} className="px-2 py-1 border rounded text-sm">
                  {DOCUMENT_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              )}
              <label className="px-3 py-1.5 bg-primary text-white rounded text-sm cursor-pointer hover:bg-primary-dark disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
          </div>
          {uploadError && <p className="px-6 py-2 text-red-600 text-sm">{uploadError}</p>}
          <div className="p-6">
            {!documents?.length ? (
              <p className="text-gray-500">No documents yet. Use Upload to add documents.</p>
            ) : (
              <TableWrapper>
                <table className="min-w-full">
                  <thead className="table-thead">
                    <tr>
                      <th className="table-th">Name</th>
                      <th className="table-th">Type</th>
                      <th className="table-th">Date</th>
                      <th className="table-th">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="table-tbody">
                    {documents.map((d) => (
                      <tr key={d.id}>
                        <td className="table-td">{d.file_name}</td>
                        <td className="table-td text-gray-600 capitalize">{d.document_type.replace(/_/g, ' ')}</td>
                        <td className="table-td">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="table-td flex gap-3">
                          <button onClick={() => setPreviewDoc({ id: d.id, fileName: d.file_name })} className="text-primary hover:underline">
                            Preview
                          </button>
                          <button onClick={() => handleDownload(d.id)} className="text-primary hover:underline">
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrapper>
            )}
          </div>
        </div>

        {previewDoc && (
          <DocumentPreviewModal
            open={!!previewDoc}
            onClose={() => setPreviewDoc(null)}
            docId={previewDoc.id}
            fileName={previewDoc.fileName}
          />
        )}
      </div>
    </div>
  );

}
