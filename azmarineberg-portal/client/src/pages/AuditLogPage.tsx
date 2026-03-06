import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

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

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = new URLSearchParams();
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String(page * PAGE_SIZE));
  if (entityType) params.set('entity_type', entityType);
  if (action) params.set('action', action);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entityType, action, from, to],
    queryFn: () =>
      api.get<AuditLogEntry[]>(`/dashboard/audit-logs?${params.toString()}`),
  });

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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : !logs?.length ? (
          <div className="p-8 text-center text-gray-500">No audit logs found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Time</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Action</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Entity</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Actor</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map((l) => (
                    <Fragment key={l.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {new Date(l.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-sm">{l.action}</td>
                        <td className="px-6 py-3 text-sm">
                          {l.entity_type}
                          {l.entity_id ? `:${String(l.entity_id).slice(0, 8)}...` : ''}
                        </td>
                        <td className="px-6 py-3 text-sm">{l.actor_email ?? '-'}</td>
                        <td className="px-6 py-3 text-sm">
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
            </div>
            <div className="px-6 py-3 border-t flex justify-between items-center">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page + 1}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={(logs?.length ?? 0) < PAGE_SIZE}
                className="px-4 py-2 rounded text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
