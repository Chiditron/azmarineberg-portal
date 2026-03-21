import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import AddServiceModal from "../components/AddServiceModal";
import AddFacilityModal from "../components/AddFacilityModal";
import { useState } from "react";
import Table from "../components/ui/Table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faPlus,
  faBuilding,
  faEnvelope,
  faPhone,
  faUser,
  faMapMarkerAlt,
  faIndustry,
  faBriefcase,
} from "@fortawesome/free-solid-svg-icons";

interface ClientDetail {
  id: string;
  company_name: string;
  email: string;
  phone?: string;
  contact_person: string;
  address: string;
  lga?: string;
  state?: string;
  zone?: string;
  industry_sector?: string;
  facilities: { id: string; facility_name: string; facility_address: string }[];
  services: {
    id: string;
    service_code: string;
    regulator_name: string;
    service_type_name: string;
    facility_name: string;
    validity_end: string;
    status: string;
  }[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  expired: "bg-red-100 text-red-700",
  in_progress: "bg-blue-100 text-blue-700",
  correction_requested: "bg-orange-100 text-orange-700",
};

export default function AdminClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAddService, setShowAddService] = useState(false);
  const [showAddFacility, setShowAddFacility] = useState(false);

  const canAddService =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.role === "staff";
  const canAddFacility = canAddService;

  const {
    data: client,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["client-detail", id],
    queryFn: () => api.get<ClientDetail>(`/admin/clients/${id}`),
    enabled: !!id,
  });

  if (isLoading || !client) {
    return (
      <div className="p-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  const serviceColumns = [
    "Service",
    "Regulator",
    "Facility",
    "Valid Until",
    "Status",
    "Action",
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/clients")}
          className="flex items-center gap-2 px-3 py-1.5 font-semibold text-gray-500 hover:text-primary hover:bg-white rounded-lg transition-all"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
          Back to Clients
        </button>
      </div>

      {/* Client Overview Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold shadow-sm ring-1 ring-primary/20 shrink-0">
                {client.company_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {client.company_name}
                </h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2 text- text-gray-500 font-medium">
                    <FontAwesomeIcon
                      icon={faEnvelope}
                      className="text-primary/40"
                    />
                    {client.email}
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text- text-gray-500 font-medium">
                      <FontAwesomeIcon
                        icon={faPhone}
                        className="text-primary/40"
                      />
                      {client.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text- text-gray-500 font-medium">
                    <FontAwesomeIcon
                      icon={faUser}
                      className="text-primary/40"
                    />
                    <span className="text-gray-400">CP:</span>{" "}
                    {client.contact_person}
                  </div>
                </div>
              </div>
            </div>
            {canAddService && client.facilities?.length > 0 && (
              <button
                onClick={() => setShowAddService(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
              >
                <FontAwesomeIcon icon={faPlus} />
                Add Service
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-gray-50">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faMapMarkerAlt}
                  className="text-primary/30"
                />
                Address
              </p>
              <p className="text-sm font-semibold text-gray-700 leading-relaxed">
                {client.address}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faMapMarkerAlt}
                  className="text-primary/30"
                />
                LGA / State
              </p>
              <p className="text-sm font-semibold text-gray-700">
                {client.lga || "-"} / {client.state || "-"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faBuilding}
                  className="text-primary/30"
                />
                Zone
              </p>
              <p className="text-sm font-semibold text-gray-700">
                {client.zone || "-"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faIndustry}
                  className="text-primary/30"
                />
                Sector
              </p>
              <p className="text-xs font-bold px-2 py-1 bg-white border border-gray-200 rounded-lg text-primary inline-block">
                {client.industry_sector || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Facilities List */}
        <div className="">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="px-6 py-5 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 font-outfit">
                Facilities
              </h3>
              {canAddFacility && (
                <button
                  onClick={() => setShowAddFacility(true)}
                  className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                </button>
              )}
            </div>
            <div className="px-6 pb-6 flex-1">
              {!client.facilities?.length ? (
                <div className="text-center py-10">
                  <p className="text-sm text-gray-400 italic">
                    No facilities registered
                  </p>
                </div>
              ) : (
                <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {client.facilities.map((f) => (
                    <li
                      key={f.id}
                      className="group p-4 rounded-xl border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0">
                          <FontAwesomeIcon
                            icon={faBuilding}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-gray-900 block">
                            {f.facility_name}
                          </span>
                          {f.facility_address && (
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                              {f.facility_address}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 flex justify-between items-center bg-gray-50/30">
              <h3 className="text-lg font-semibold text-gray-900 font-outfit flex items-center gap-2">
                Services Overview
              </h3>
              <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-primary">
                {client.services?.length ?? 0} Total
              </span>
            </div>

            {!client.services?.length ? (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <FontAwesomeIcon
                    icon={faBriefcase}
                    className="text-gray-300 text-2xl"
                  />
                </div>
                <p className="text-gray-500 font-bold">No services yet</p>
                <p className="text-sm text-gray-400 mt-1 max-w-[240px]">
                  This client hasn't been assigned any regulatory services yet.
                </p>
              </div>
            ) : (
              <div className="flex-1">
                <Table columns={serviceColumns}>
                  {client.services.map((s, index) => (
                    <tr
                      key={s.id}
                      className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <td className="px-5 py-4 text-sm font-semibold text-gray-400">
                        {index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 line-clamp-1">
                            {s.service_type_name ?? s.service_code}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            {s.service_code}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 font-medium">
                        {s.regulator_name ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {s.facility_name ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                        {new Date(s.validity_end).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${statusColors[s.status] || "bg-gray-100 text-gray-600"}`}
                        >
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <Link
                          to={`/services/${s.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg font-bold text-xs transition-all uppercase"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddServiceModal
        open={showAddService}
        onClose={() => setShowAddService(false)}
        onSuccess={() => refetch()}
        companyId={client.id}
        facilities={client.facilities ?? []}
      />
      <AddFacilityModal
        open={showAddFacility}
        onClose={() => setShowAddFacility(false)}
        onSuccess={() => refetch()}
        companyId={client.id}
        companyAddress={client.address}
        companyLga={client.lga}
        companyState={client.state}
        companyZone={client.zone}
      />
    </div>
  );
}
