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
import {
  formatValidityDisplay,
  VALIDITY_UNIT_OPTIONS,
  normalizeServiceTypeRow,
  type ValidityUnitValue,
} from "../utils/formatValidityPeriod";

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
  validity_count: number | null;
  validity_unit: ValidityUnitValue | null;
}

const ServiceTypeSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  code: Yup.string().required("Required"),
  regulator_id: Yup.string().required("Required"),
  validity_count: Yup.number()
    .typeError("Enter a valid number")
    .integer("Use a whole number")
    .min(1, "At least 1")
    .max(999, "At most 999")
    .required("Required"),
  validity_unit: Yup.string()
    .oneOf(["days", "weeks", "months", "years"], "Select a unit")
    .required("Required"),
});

type ServiceTypePayload = {
  name: string;
  code: string;
  regulator_id: string;
  validity_count: number;
  validity_unit: ValidityUnitValue;
};

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
    queryFn: async () => {
      const rows = await api.get<Record<string, unknown>[]>(
        filterRegulator
          ? `/admin/service-types?regulatorId=${filterRegulator}`
          : "/admin/service-types",
      );
      return rows.map(normalizeServiceTypeRow);
    },
  });

  const filtered = serviceTypes?.filter(
    (st) =>
      !search ||
      st.name.toLowerCase().includes(search.toLowerCase()) ||
      st.code.toLowerCase().includes(search.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (body: ServiceTypePayload) =>
      api.post<ServiceType>("/admin/service-types", body),
    onSuccess: (created) => {
      const n = normalizeServiceTypeRow(created as unknown as Record<string, unknown>);
      queryClient.setQueriesData<ServiceType[]>(
        { queryKey: ["service-types"] },
        (old) => {
          if (!old?.length) return [n];
          if (old.some((x) => x.id === n.id)) {
            return old.map((x) =>
              x.id === n.id
                ? { ...x, ...n, regulator_name: n.regulator_name ?? x.regulator_name }
                : x,
            );
          }
          return [...old, n];
        },
      );
      // Do not invalidate here: refetch can overwrite with GET rows missing validity until API/DB are fully deployed.
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: ServiceTypePayload;
    }) => api.put<ServiceType>(`/admin/service-types/${id}`, body),
    onSuccess: (updated) => {
      const n = normalizeServiceTypeRow(updated as unknown as Record<string, unknown>);
      queryClient.setQueriesData<ServiceType[]>(
        { queryKey: ["service-types"] },
        (old) =>
          old?.map((st) =>
            st.id === n.id
              ? { ...st, ...n, regulator_name: n.regulator_name ?? st.regulator_name }
              : st,
          ) ?? old,
      );
      // Do not invalidate here: refetch can overwrite merged validity from PUT when GET omits those fields.
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
    "Validity",
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
          key={editing?.id ?? "create"}
          initialValues={{
            name: editing?.name ?? "",
            code: editing?.code ?? "",
            regulator_id: editing?.regulator_id ?? "",
            validity_count: editing?.validity_count ?? 1,
            validity_unit: (editing?.validity_unit ?? "years") as ValidityUnitValue,
          }}
          validationSchema={ServiceTypeSchema}
          enableReinitialize
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            try {
              const body: ServiceTypePayload = {
                name: values.name.trim(),
                code: values.code.trim(),
                regulator_id: values.regulator_id,
                validity_count: Number(values.validity_count),
                validity_unit: values.validity_unit as ValidityUnitValue,
              };
              if (editing) {
                await updateMutation.mutateAsync({
                  id: editing.id,
                  body,
                });
              } else {
                await createMutation.mutateAsync(body);
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextLabelInput
                    label="Validity duration *"
                    name="validity_count"
                    type="number"
                    min={1}
                    max={999}
                    placeholder="e.g. 1"
                  />
                  <SingleSelectInput
                    label="Validity unit *"
                    name="validity_unit"
                    options={[...VALIDITY_UNIT_OPTIONS]}
                  />
                </div>
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
                    <span className="text-gray-700 text-sm font-medium">
                      {formatValidityDisplay(st.validity_count, st.validity_unit)}
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
