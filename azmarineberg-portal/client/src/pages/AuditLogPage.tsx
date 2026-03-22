import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import TableWrapper from '../components/TableWrapper';

interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
  actor_email: string | null;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = new URLSearchParams();
  params.set('limit', String(pageSize));
  params.set('offset', String(page * pageSize));
  if (entityType) params.set('entity_type', entityType);
  if (action) params.set('action', action);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const queryString = params.toString();
  const { data: response, isLoading } = useQuery({
    queryKey: ['audit-logs', page, pageSize, entityType, action, from, to, queryString],
    queryFn: () =>
      api.get<{ rows?: AuditLogEntry[]; total?: number } | AuditLogEntry[]>(`/dashboard/audit-logs?${queryString}`),
  });

  // Support both { rows, total } (new) and plain array (old API)
  const logs: AuditLogEntry[] = Array.isArray(response)
    ? response
    : (response?.rows ?? []);
  const total: number = Array.isArray(response)
    ? response.length  // old API: no total, use current page length so at least one page works
    : (response?.total ?? 0);
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const hasNext = page + 1 < totalPages;
  const hasPrev = page > 0;
  const startRow = total === 0 ? 0 : page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, total);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h2>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-3">Filters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Entity Type</label>
            <input
              type="text"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(0);
              }}
              placeholder="e.g. company, user"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Action</label>
            <input
              type="text"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(0);
              }}
              placeholder="e.g. create_client"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setEntityType('');
                setAction('');
                setFrom('');
                setTo('');
                setPage(0);
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : total === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit logs found.</div>
        ) : (
          <>
            <TableWrapper maxHeight="min(70vh, 32rem)">
              <table className="min-w-full">
                <thead className="table-thead">
                  <tr>
                    <th className="table-th">Time</th>
                    <th className="table-th">Action</th>
                    <th className="table-th">Entity</th>
                    <th className="table-th">Actor</th>
                    <th className="table-th">Details</th>
                  </tr>
                </thead>
                <tbody className="table-tbody">
                  {logs.map((l) => (
                    <Fragment key={l.id}>
                      <tr>
                        <td className="table-td text-gray-600">
                          {new Date(l.created_at).toLocaleString()}
                        </td>
                        <td className="table-td">{l.action}</td>
                        <td className="table-td">
                          {l.entity_type}
                          {l.entity_id ? `:${String(l.entity_id).slice(0, 8)}...` : ''}
                        </td>
                        <td className="table-td">{l.actor_email ?? '-'}</td>
                        <td className="table-td">
                          {l.changes && Object.keys(l.changes).length > 0 ? (
                            <button
                              onClick={() =>
                                setExpandedId(expandedId === l.id ? null : l.id)
                              }
                              className="text-primary hover:underline text-sm"
                            >
                              {expandedId === l.id ? 'Hide' : 'View details'}
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                      {expandedId === l.id && l.changes && (
                        <tr>
                          <td colSpan={5} className="px-6 py-3 bg-gray-50">
                            <pre className="text-xs overflow-x-auto text-gray-700">
                              {JSON.stringify(l.changes, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </TableWrapper>
            <div className="px-6 py-3 border-t flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(0);
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <span className="text-sm text-gray-600">
                  Showing {startRow}–{endRow} of {total}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={!hasPrev}
                  className="px-4 py-2 rounded text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasNext}
                  className="px-4 py-2 rounded text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
