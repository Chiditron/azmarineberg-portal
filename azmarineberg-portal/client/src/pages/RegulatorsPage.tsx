import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import Table from "../components/ui/Table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldAlt,
  faEdit,
  faTrash,
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

const RegulatorSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  code: Yup.string().required("Required"),
  level: Yup.string().required("Required"),
});

export default function RegulatorsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Regulator | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Regulator | null>(null);

  const canEdit = user?.role === "admin" || user?.role === "super_admin";

  const { data: regulators, isLoading } = useQuery({
    queryKey: ["regulators"],
    queryFn: () => api.get<Regulator[]>("/admin/regulators"),
  });

  const filtered = regulators?.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (body: { name: string; code: string; level: string }) =>
      api.post<Regulator>("/admin/regulators", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulators"] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name: string; code: string; level: string };
    }) => api.put<Regulator>(`/admin/regulators/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulators"] });
      setShowModal(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/regulators/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regulators"] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (r: Regulator) => {
    setEditing(r);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const columns = ["Name", "Code", "Level", ...(canEdit ? ["Actions"] : [])];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regulators"
        description="Manage regulatory bodies and enforcement levels"
      />

      <SearchSection
        searchValue={search}
        onSearchChange={setSearch}
        actionLabel="Add Regulator"
        onActionClick={openCreate}
        placeholder="Search regulators by name or code..."
      />

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? "Edit Regulator" : "Add Regulator"}
        description="Define a regulatory body responsible for services"
        width="max-w-3xl"
      >
        <Formik
          initialValues={{
            name: editing?.name ?? "",
            code: editing?.code ?? "",
            level: editing?.level ?? "federal",
          }}
          validationSchema={RegulatorSchema}
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
                <TextLabelInput
                  label="Regulator Name *"
                  name="name"
                  placeholder="e.g. National Environmental Standards..."
                />

                <TextLabelInput
                  label="Abbreviation / Code *"
                  name="code"
                  placeholder="e.g. NESREA"
                />

                <SingleSelectInput
                  label="Authority Level *"
                  name="level"
                  options={[
                    { value: "federal", label: "Federal Authority" },
                    { value: "state", label: "State Authority" },
                  ]}
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
                      ? "Update Regulator"
                      : "Add Regulator"}
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
                Loading regulators...
              </p>
            </div>
          ) : !filtered?.length ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <FontAwesomeIcon icon={faShieldAlt} className="text-2xl" />
              </div>
              <p className="text-gray-500 font-bold font-poppins">
                No regulators found
              </p>
              <p className="text-sm text-gray-400 mt-1 font-lato">
                Get started by adding a new regulator
              </p>
            </div>
          ) : (
            <Table columns={columns}>
              {filtered.map((r, index) => (
                <tr
                  key={r.id}
                  className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0"
                >
                  <td className="px-5 py-4 text-sm font-semibold text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-5 py-4 font-lato">
                    <span className="text-gray-900 font-medium">{r.name}</span>
                  </td>
                  <td className="px-5 py-4 font-lato">
                    <span className="text-xs font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-600 uppercase tracking-wider">
                      {r.code}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-lato">
                    <span
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider ${r.level === "federal" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}
                    >
                      {r.level}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="px-5 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(r)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                          title="Edit"
                        >
                          <FontAwesomeIcon icon={faEdit} className="text-xs" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          disabled={deleteMutation.isPending}
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
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
        warning="This will fail if it has service types."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
