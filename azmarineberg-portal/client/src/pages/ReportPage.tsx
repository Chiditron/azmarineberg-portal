import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import Modal from "../components/ui/Modal";
import Table from "../components/ui/Table";
import PageHeader from "../components/ui/PageHeader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faFileExport,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

interface ReportRow {
  serviceId: string;
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

const DEFAULT_PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "site_visit", label: "Site Visit" },
  { value: "report_preparation", label: "Report Preparation" },
  { value: "submission", label: "Submission" },
  { value: "approved", label: "Approved" },
  { value: "closed", label: "Closed" },
];

function buildReportParams(
  page: number,
  pageSize: number,
  facilityId: string,
  sectorId: string,
  serviceTypeId: string,
  regulatorId: string,
  status: string,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("limit", String(pageSize));
  params.set("offset", String(page * pageSize));
  if (facilityId) params.set("facility_id", facilityId);
  if (sectorId) params.set("sector", sectorId);
  if (serviceTypeId) params.set("service_type_id", serviceTypeId);
  if (regulatorId) params.set("regulator_id", regulatorId);
  if (status) params.set("status", status);
  return params;
}

function buildExportParams(
  format: string,
  facilityId: string,
  sectorId: string,
  serviceTypeId: string,
  regulatorId: string,
  status: string,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("format", format);
  if (facilityId) params.set("facility_id", facilityId);
  if (sectorId) params.set("sector", sectorId);
  if (serviceTypeId) params.set("service_type_id", serviceTypeId);
  if (regulatorId) params.set("regulator_id", regulatorId);
  if (status) params.set("status", status);
  return params;
}

const statusBadgeClass: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  draft: "bg-yellow-100 text-yellow-700",
  submission: "bg-blue-100 text-blue-700",
  site_visit: "bg-purple-100 text-purple-700",
  report_preparation: "bg-orange-100 text-orange-700",
};

export default function ReportPage() {
  // Applied filter state (drives the query)
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [facilityId, setFacilityId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [regulatorId, setRegulatorId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  // Draft filter state (pending until Apply is clicked)
  const [draftFacilityId, setDraftFacilityId] = useState("");
  const [draftSectorId, setDraftSectorId] = useState("");
  const [draftServiceTypeId, setDraftServiceTypeId] = useState("");
  const [draftRegulatorId, setDraftRegulatorId] = useState("");
  const [draftStatus, setDraftStatus] = useState("");

  // UI state
  const [showFilter, setShowFilter] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showExport]);

  const params = buildReportParams(
    page,
    pageSize,
    facilityId,
    sectorId,
    serviceTypeId,
    regulatorId,
    status,
  );

  const { data, isLoading } = useQuery({
    queryKey: [
      "report",
      page,
      pageSize,
      facilityId,
      sectorId,
      serviceTypeId,
      regulatorId,
      status,
    ],
    queryFn: () =>
      api.get<{ rows: ReportRow[]; total: number }>(
        `/admin/report?${params.toString()}`,
      ),
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["facilities"],
    queryFn: () => api.get<FacilityOption[]>("/admin/facilities"),
  });

  const { data: sectors = [] } = useQuery({
    queryKey: ["industry-sectors"],
    queryFn: () => api.get<SectorOption[]>("/admin/industry-sectors"),
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["service-types"],
    queryFn: () => api.get<ServiceTypeOption[]>("/admin/service-types"),
  });

  const { data: regulators = [] } = useQuery({
    queryKey: ["regulators"],
    queryFn: () => api.get<RegulatorOption[]>("/admin/regulators"),
  });

  const total = data?.total ?? 0;
  const allRows = data?.rows ?? [];
  const rows = search
    ? allRows.filter((r) =>
        [r.facility, r.address, r.sector, r.service, r.regulator, r.status]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : allRows;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openFilterModal = () => {
    // Sync draft with current applied values when opening
    setDraftFacilityId(facilityId);
    setDraftSectorId(sectorId);
    setDraftServiceTypeId(serviceTypeId);
    setDraftRegulatorId(regulatorId);
    setDraftStatus(status);
    setShowFilter(true);
  };

  const applyFilters = () => {
    setFacilityId(draftFacilityId);
    setSectorId(draftSectorId);
    setServiceTypeId(draftServiceTypeId);
    setRegulatorId(draftRegulatorId);
    setStatus(draftStatus);
    setPage(0);
    setShowFilter(false);
  };

  const handleExport = useCallback(
    async (format: "csv" | "excel" | "pdf") => {
      setShowExport(false);
      const ext = format === "excel" ? "xlsx" : format;
      const q = buildExportParams(
        format === "excel" ? "excel" : format,
        facilityId,
        sectorId,
        serviceTypeId,
        regulatorId,
        status,
      );
      const blob = await api.downloadBlob(
        `/admin/report/export?${q.toString()}`,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${new Date().toISOString().slice(0, 10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [facilityId, sectorId, serviceTypeId, regulatorId, status],
  );

  const columns = [
    "Facility",
    "Address",
    "Sector",
    "Service",
    "Regulator",
    "Status",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="View and export facility compliance service reports"
      />

      {/* Search + Filter + Export bar */}
      <div className="flex gap-3 items-center">
        {/* Search */}
        <div className="flex-grow relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <FontAwesomeIcon icon={faSearch} className="text-sm" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="w-full h-12 pl-11 pr-4 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-sm font-medium text-gray-700 font-lato"
          />
        </div>

        {/* Filter button */}
        <button
          type="button"
          onClick={openFilterModal}
          className="h-12 px-5 flex items-center gap-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-primary hover:text-primary transition-all font-poppins whitespace-nowrap"
        >
          <FontAwesomeIcon icon={faFilter} className="text-xs" />
          Filter
          {(facilityId ||
            sectorId ||
            serviceTypeId ||
            regulatorId ||
            status) && (
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          )}
        </button>

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            type="button"
            onClick={() => setShowExport((v) => !v)}
            className="h-12 px-5 flex items-center gap-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all font-poppins whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faFileExport} className="text-xs" />
            Export
            <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
          </button>
          {showExport && (
            <div className="absolute right-0 top-14 w-44 bg-white rounded-xl border border-gray-100 shadow-xl z-30 overflow-hidden">
              {[
                { label: "Export CSV", format: "csv" as const },
                { label: "Export Excel", format: "excel" as const },
                { label: "Export PDF", format: "pdf" as const },
              ].map(({ label, format }) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleExport(format)}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors font-lato"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      <Modal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Reports"
        description="Select values and click Apply to update results"
        width="max-w-3xl"
      >
        <div className="space-y-6 font-lato">
          <div className="grid grid-cols-2 gap-5">
            {/* Facility */}
            <div>
              <label className="text-gray-800 font-semibold text-sm block mb-1">
                Facility
              </label>
              <select
                value={draftFacilityId}
                onChange={(e) => setDraftFacilityId(e.target.value)}
                className="w-full h-12 px-3 border border-gray-400 rounded-md text-sm outline-none focus:border-primary transition-all"
              >
                <option value="">All Facilities</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facility_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sector */}
            <div>
              <label className="text-gray-800 font-semibold text-sm block mb-1">
                Sector
              </label>
              <select
                value={draftSectorId}
                onChange={(e) => setDraftSectorId(e.target.value)}
                className="w-full h-12 px-3 border border-gray-400 rounded-md text-sm outline-none focus:border-primary transition-all"
              >
                <option value="">All Sectors</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Service */}
            <div>
              <label className="text-gray-800 font-semibold text-sm block mb-1">
                Service
              </label>
              <select
                value={draftServiceTypeId}
                onChange={(e) => setDraftServiceTypeId(e.target.value)}
                className="w-full h-12 px-3 border border-gray-400 rounded-md text-sm outline-none focus:border-primary transition-all"
              >
                <option value="">All Services</option>
                {serviceTypes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Regulator */}
            <div>
              <label className="text-gray-800 font-semibold text-sm block mb-1">
                Regulator
              </label>
              <select
                value={draftRegulatorId}
                onChange={(e) => setDraftRegulatorId(e.target.value)}
                className="w-full h-12 px-3 border border-gray-400 rounded-md text-sm outline-none focus:border-primary transition-all"
              >
                <option value="">All Regulators</option>
                {regulators.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status — spans full width only if odd */}
            <div>
              <label className="text-gray-800 font-semibold text-sm block mb-1">
                Status
              </label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="w-full h-12 px-3 border border-gray-400 rounded-md text-sm outline-none focus:border-primary transition-all"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
        loadingMessage="Loading reports..."
        emptyMessage="No records match the current filters"
        pageIndex={page}
        pageCount={totalPages}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      >
        {rows.map((row, i) => (
          <tr
            key={i}
            className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0 font-lato"
          >
            <td className="px-5 py-4 text-sm font-semibold text-gray-400 text-center">
              {page * pageSize + i + 1}
            </td>
            <td className="px-5 py-4">
              <span className="font-semibold text-gray-900 text-sm">
                {row.facility}
              </span>
            </td>
            <td className="px-5 py-4 text-sm text-gray-600">{row.address}</td>
            <td className="px-5 py-4 text-sm text-gray-600">{row.sector}</td>
            <td className="px-5 py-4 text-sm text-gray-600">{row.service}</td>
            <td className="px-5 py-4 text-sm text-gray-600">{row.regulator}</td>
            <td className="px-5 py-4">
              <span
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${
                  statusBadgeClass[row.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {row.status.replace(/_/g, " ")}
              </span>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
