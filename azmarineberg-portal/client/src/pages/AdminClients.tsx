import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import CreateClientModal from "../components/CreateClientModal";
import Table from "../components/ui/Table";
import PageHeader from "../components/ui/PageHeader";
import SearchSection from "../components/ui/SearchSection";

interface Company {
  id: string;
  company_name: string;
  email: string;
  contact_person: string;
  state: string;
  zone: string;
  industry_sector: string;
  facility_count: number;
  service_count: number;
}

export default function AdminClients() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const canCreate = user?.role === "admin" || user?.role === "super_admin";

  const {
    data: clients,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-clients"],
    queryFn: () => api.get<Company[]>("/admin/clients"),
  });

  const filtered = clients?.filter(
    (c) =>
      !search ||
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    "Company",
    "Contact",
    "State / Zone",
    "Sector",
    "Facilities",
    "Services",
    "Action",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage all client organizations and their services"
      />

      <SearchSection
        searchValue={search}
        onSearchChange={setSearch}
        actionLabel="Add Client"
        onActionClick={() => setShowCreate(true)}
        placeholder="Search clients by name or email..."
      />

      <CreateClientModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => refetch()}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto hide_scrollbar">
          {isLoading ? (
            <div className="p-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium font-lato">
                Loading clients...
              </p>
            </div>
          ) : !filtered?.length ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 font-bold font-poppins">
                No clients found
              </p>
              <p className="text-sm text-gray-400 mt-1 font-lato">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <Table columns={columns}>
              {filtered.map((c, index) => (
                <tr
                  key={c.id}
                  className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0"
                >
                  <td className="px-5 py-4 text-sm font-semibold text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-5 py-4 font-lato">
                    <div className="flex flex-col">
                      <span className="text-gray-900">
                        {c.company_name}
                      </span>
                      <span className="text-sm text-gray-500">{c.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 font-medium font-lato">
                    {c.contact_person}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 font-lato">
                    {c.state} / {c.zone}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600 font-lato">
                    <span className="px-2.5 py-1 bg-gray-100 rounded-lg font-semibold text-gray-600">
                      {c.industry_sector}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-primary font-lato">
                    {c.facility_count ?? 0}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-primary font-lato">
                    {c.service_count ?? 0}
                  </td>
                  <td className="px-5 py-4 text-sm font-poppins">
                    <Link
                      to={`/admin/clients/${c.id}`}
                      className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg font-bold text-xs transition-all tracking-wide uppercase"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
