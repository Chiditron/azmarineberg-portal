import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import Table from "../components/ui/Table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLayerGroup,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "../components/ui/PageHeader";
import SearchSection from "../components/ui/SearchSection";
import Modal from "../components/ui/Modal";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { TextLabelInput } from "../components/ui/FormFields";

interface IndustrySector {
  id: string;
  name: string;
  code: string;
}

const SectorSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  code: Yup.string().required("Required"),
});

export default function IndustrySectorsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IndustrySector | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IndustrySector | null>(null);

  const canEdit = user?.role === "super_admin";

  const { data: sectors, isLoading } = useQuery({
    queryKey: ["industry-sectors"],
    queryFn: () => api.get<IndustrySector[]>("/admin/industry-sectors"),
  });

  const filtered = sectors?.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (body: { name: string; code: string }) =>
      api.post<IndustrySector>("/admin/industry-sectors", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry-sectors"] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name: string; code: string };
    }) => api.put<IndustrySector>(`/admin/industry-sectors/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry-sectors"] });
      setShowModal(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/industry-sectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["industry-sectors"] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (s: IndustrySector) => {
    setEditing(s);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const columns = ["Name", "Code", ...(canEdit ? ["Actions"] : [])];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industry Sectors"
        description="Manage different business sectors and categories"
      />

      <SearchSection
        searchValue={search}
        onSearchChange={setSearch}
        actionLabel="Add Sector"
        onActionClick={openCreate}
        placeholder="Search sectors by name or code..."
      />

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? "Edit Sector" : "Add Sector"}
        description="Define a new industry sector for organization categorisation"
        width="max-w-3xl"
      >
        <Formik
          initialValues={{
            name: editing?.name ?? "",
            code: editing?.code ?? "",
          }}
          validationSchema={SectorSchema}
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
                  label="Sector Name *"
                  name="name"
                  placeholder="e.g. Manufacturing"
                />

                <TextLabelInput
                  label="Sector Code *"
                  name="code"
                  placeholder="e.g. MFG"
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
                      ? "Update Sector"
                      : "Add Sector"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </Modal>

      <Table
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading sectors..."
        emptyMessage="No industry sectors found"
        emptyIcon={<FontAwesomeIcon icon={faLayerGroup} className="text-2xl" />}
      >
        {filtered?.map((s, index) => (
          <tr
            key={s.id}
            className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0 font-lato"
          >
            <td className="px-5 py-4 text-sm font-semibold text-gray-400 text-center">
              {index + 1}
            </td>
            <td className="px-5 py-4">
              <span className="text-gray-700">{s.name}</span>
            </td>
            <td className="px-5 py-4">
              <span className="text-sm font-bold px-2 py-1 bg-gray-100 rounded-lg text-gray-600 uppercase tracking-wider">
                {s.code}
              </span>
            </td>
            {canEdit && (
              <td className="px-5 py-4 text-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                    title="Edit"
                  >
                    <FontAwesomeIcon icon={faEdit} className="text-sm" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
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

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        message={deleteTarget ? `Delete ${deleteTarget.name}?` : ""}
        warning="This will fail if companies use this sector."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
