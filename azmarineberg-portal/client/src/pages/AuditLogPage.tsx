import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import PageHeader from "../components/ui/PageHeader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";

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

function formatAction(text: string): string {
  return text.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditLogPage() {
  // Applied filter state (drives query)
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Draft filter state (pending until Apply is clicked)
  const [draftEntityType, setDraftEntityType] = useState("");
  const [draftAction, setDraftAction] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const [showFilter, setShowFilter] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const params = new URLSearchParams();
  params.set("limit", String(pageSize));
  params.set("offset", String(page * pageSize));
  if (entityType) params.set("entity_type", entityType);
  if (action) params.set("action", action);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const queryString = params.toString();
  const { data: response, isLoading } = useQuery({
    queryKey: [
      "audit-logs",
      page,
      pageSize,
      entityType,
      action,
      from,
      to,
      queryString,
    ],
    queryFn: () =>
      api.get<{ rows?: AuditLogEntry[]; total?: number } | AuditLogEntry[]>(
        `/dashboard/audit-logs?${queryString}`,
      ),
  });

  // Support both { rows, total } and plain array API responses
  const logs: AuditLogEntry[] = Array.isArray(response)
    ? response
    : (response?.rows ?? []);
  const total: number = Array.isArray(response)
    ? response.length
    : (response?.total ?? 0);
  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  const openFilterModal = () => {
    setDraftEntityType(entityType);
    setDraftAction(action);
    setDraftFrom(from);
    setDraftTo(to);
    setShowFilter(true);
  };

  const applyFilters = () => {
    setEntityType(draftEntityType);
    setAction(draftAction);
    setFrom(draftFrom);
    setTo(draftTo);
    setPage(0);
    setShowFilter(false);
  };

  const hasActiveFilters = entityType || action || from || to;

  const columns = ["Time", "Action", "Entity", "Actor", "Details"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track all system actions and user activity"
      />

      {/* Action bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openFilterModal}
          className="h-12 px-5 flex items-center gap-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary transition-all font-poppins"
        >
          <FontAwesomeIcon icon={faFilter} className="text-xs" />
          Filter
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          )}
        </button>
      </div>

      {/* Filter Modal */}
      <Modal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Audit Log"
        description="Select values and click Apply to update results"
        width="max-w-3xl"
      >
        <div className="space-y-6 font-lato">
          <div className="grid grid-cols-2 gap-5">
            {/* Entity Type */}
            <div>
              <label className="text-gray-800 font-semibold text-sm block mb-1">
                Entity Type
              </label>
              <input
                type="text"
                value={draftEntityType}
                onChange={(e) => setDraftEntityType(e.target.value)}
                placeholder="e.g. company, user"
                className="w-full h-12 px-3 border border-gray-400 rounded-md text-sm outline-none focus:border-primary transition-all"
              />
            </div>

            {/* Action */}
            <div>
              <label className="text-gray-800 font-semibold text-sm block mb-1">
                Action
              </label>
              <input
                type="text"
                value={draftAction}
                onChange={(e) => setDraftAction(e.target.value)}
                placeholder="e.g. create_client"
                className="w-full h-12 px-3 border border-gray-400 rounded-md text-sm outline-none focus:border-primary transition-all"
              />
            </div>

            {/* From Date */}
            <div>
              <label className="text-gray-800 font-semibold text-sm block mb-1">
                From Date
              </label>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="w-full h-12 px-3 border border-gray-400 rounded-md text-sm outline-none focus:border-primary transition-all"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="text-gray-800 font-semibold text-sm block mb-1">
                To Date
              </label>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="w-full h-12 px-3 border border-gray-400 rounded-md text-sm outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Apply button */}
          <div className="pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={applyFilters}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] font-poppins"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </Modal>

      {/* Table */}
      <Table
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading audit logs..."
        emptyMessage="No audit logs found"
        pageIndex={page}
        pageCount={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      >
        {logs.map((l) => (
          <Fragment key={l.id}>
            <tr className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0 font-lato">
              <td className="px-5 py-4 text-sm font-semibold text-gray-400 text-center">
                —
              </td>
              <td className="px-5 py-4 text-sm text-gray-600">
                {new Date(l.created_at).toLocaleString()}
              </td>
              <td className="px-5 py-4">
                <span className="text-sm font-medium text-gray-800">
                  {formatAction(l.action)}
                </span>
              </td>
              <td className="px-5 py-4 text-sm text-gray-600">
                <span className="font-medium text-gray-700">
                  {l.entity_type}
                </span>
                {l.entity_id ? (
                  <span className="text-gray-400 ml-1">
                    :{String(l.entity_id).slice(0, 8)}...
                  </span>
                ) : null}
              </td>
              <td className="px-5 py-4 text-sm text-gray-600">
                {l.actor_email ?? "—"}
              </td>
              <td className="px-5 py-4 text-sm">
                {l.changes && Object.keys(l.changes).length > 0 ? (
                  <button
                    onClick={() =>
                      setExpandedId(expandedId === l.id ? null : l.id)
                    }
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    {expandedId === l.id ? "Hide" : "View details"}
                  </button>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
            {expandedId === l.id && l.changes && (
              <tr>
                <td colSpan={6} className="px-6 py-4 bg-gray-50/80">
                  <pre className="text-xs overflow-x-auto text-gray-700 font-mono">
                    {JSON.stringify(l.changes, null, 2)}
                  </pre>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </Table>
    </div>
  );
}
