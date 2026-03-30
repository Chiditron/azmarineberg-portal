import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import Table from "../components/ui/Table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBriefcase,
  faEdit,
  faTrash,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "../components/ui/PageHeader";
import SearchSection from "../components/ui/SearchSection";
import Modal from "../components/ui/Modal";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { TextLabelInput, SingleSelectInput } from "../components/ui/FormFields";

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
  regulator_name?: string;
}

const ServiceTypeSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  code: Yup.string().required("Required"),
  regulator_id: Yup.string().required("Required"),
});

export default function ServiceTypesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceType | null>(null);
  const [filterRegulator, setFilterRegulator] = useState("");

  const canEdit = user?.role === "admin" || user?.role === "super_admin";

  const { data: regulators } = useQuery({
    queryKey: ["regulators"],
    queryFn: () => api.get<Regulator[]>("/admin/regulators"),
  });

  const { data: serviceTypes, isLoading } = useQuery({
    queryKey: ["service-types", filterRegulator],
    queryFn: () =>
      api.get<ServiceType[]>(
        filterRegulator
          ? `/admin/service-types?regulatorId=${filterRegulator}`
          : "/admin/service-types",
      ),
  });

  const filtered = serviceTypes?.filter(
    (st) =>
      !search ||
      st.name.toLowerCase().includes(search.toLowerCase()) ||
      st.code.toLowerCase().includes(search.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (body: { name: string; code: string; regulator_id: string }) =>
      api.post<ServiceType>("/admin/service-types", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name: string; code: string; regulator_id: string };
    }) => api.put<ServiceType>(`/admin/service-types/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
      setShowModal(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/service-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types"] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (st: ServiceType) => {
    setEditing(st);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const columns = [
    "Name",
    "Code",
    "Regulator",
    ...(canEdit ? ["Actions"] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Types"
        description="Manage types of services offered by regulators"
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="md:w-48 h-12 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <FontAwesomeIcon icon={faFilter} className="text-sm" />
          </div>
          <select
            value={filterRegulator}
            onChange={(e) => {
              setFilterRegulator(e.target.value);
              setSearch('');
            }}
            className="w-full h-full pl-11 pr-8 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none text-sm font-semibold text-gray-700 appearance-none"
          >
            <option value="">All Regulators</option>
            {regulators?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-grow">
          <SearchSection
            searchValue={search}
            onSearchChange={setSearch}
            actionLabel="Add Service Type"
            onActionClick={openCreate}
            placeholder="Search service types..."
          />
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? "Edit Service Type" : "Add Service Type"}
        description="Define a new category of regulatory service"
        width="max-w-3xl"
      >
        <Formik
          initialValues={{
            name: editing?.name ?? "",
            code: editing?.code ?? "",
            regulator_id: editing?.regulator_id ?? "",
          }}
          validationSchema={ServiceTypeSchema}
          enableReinitialize
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            try {
              if (editing) {
                await updateMutation.mutateAsync({
                  id: editing.id,
                  body: values,
                });
              } else {
                await createMutation.mutateAsync(values);
              }
              closeModal();
            } catch (err) {
              setStatus(err instanceof Error ? err.message : "Action failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, status }) => (
            <Form className="space-y-6 font-lato">
              {status && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
                  {status}
                </div>
              )}

              <div className="space-y-5">
                <SingleSelectInput
                  label="Target Regulator *"
                  name="regulator_id"
                  options={
                    regulators?.map((r) => ({
                      value: r.id,
                      label: `${r.name} (${r.code})`,
                    })) || []
                  }
                  isLoading={!regulators}
                />

                <TextLabelInput
                  label="Service Type Name *"
                  name="name"
                  placeholder="e.g. Air Quality Monitoring"
                />

                <TextLabelInput
                  label="Technical Code *"
                  name="code"
                  placeholder="e.g. AQM"
                />
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 font-poppins"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editing
                      ? "Update Service Type"
                      : "Add Service Type"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </Modal>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto hide_scrollbar">
          {isLoading ? (
            <div className="p-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium font-lato">
                Loading service types...
              </p>
            </div>
          ) : !filtered?.length ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <FontAwesomeIcon icon={faBriefcase} className="text-2xl" />
              </div>
              <p className="text-gray-500 font-bold font-poppins">
                No service types found
              </p>
              <p className="text-sm text-gray-400 mt-1 font-lato">
                Try adjusting your filters or add a new type
              </p>
            </div>
          ) : (
            <Table columns={columns}>
              {filtered.map((st, index) => (
                <tr
                  key={st.id}
                  className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0 font-lato"
                >
                  <td className="px-5 py-4 text-sm font-semibold text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-gray-900">{st.name}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-600 uppercase tracking-wider">
                      {st.code}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-gray-600 font-medium">
                      {st.regulator_name ?? "-"}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-5 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(st)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} className="text-sm" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(st)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          disabled={deleteMutation.isPending}
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-sm" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        message={deleteTarget ? `Delete ${deleteTarget.name}?` : ""}
        warning="This will fail if it is used by any services."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
