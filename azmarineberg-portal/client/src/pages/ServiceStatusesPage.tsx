import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import Table from "../components/ui/Table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faListCheck,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import PageHeader from "../components/ui/PageHeader";
import SearchSection from "../components/ui/SearchSection";
import Modal from "../components/ui/Modal";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { TextLabelInput } from "../components/ui/FormFields";

import type { ServiceStatusDefinition } from "../types/serviceStatus";

const CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

const StatusSchema = Yup.object().shape({
  code: Yup.string()
    .matches(CODE_PATTERN, "Lowercase letters, numbers, underscores; start with a letter")
    .required("Required"),
  label: Yup.string().required("Required"),
  sort_order: Yup.number().required("Required").integer("Must be a whole number"),
  requires_approval_effective_date: Yup.boolean(),
  is_terminal: Yup.boolean(),
  is_active: Yup.boolean(),
});

const EditStatusSchema = StatusSchema.omit(["code"]);

export default function ServiceStatusesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ServiceStatusDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceStatusDefinition | null>(null);

  const canEdit = user?.role === "admin" || user?.role === "super_admin";

  const { data: statuses, isLoading } = useQuery({
    queryKey: ["service-statuses", "all"],
    queryFn: () =>
      api.get<ServiceStatusDefinition[]>("/admin/service-statuses?includeInactive=true"),
  });

  const filtered = statuses?.filter(
    (s) =>
      !search ||
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (body: Omit<ServiceStatusDefinition, "id">) =>
      api.post<ServiceStatusDefinition>("/admin/service-statuses", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-statuses"] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Omit<ServiceStatusDefinition, "id" | "code">;
    }) => api.put<ServiceStatusDefinition>(`/admin/service-statuses/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-statuses"] });
      setShowModal(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/service-statuses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-statuses"] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (s: ServiceStatusDefinition) => {
    setEditing(s);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const nextSortOrder =
    statuses?.length
      ? Math.max(...statuses.map((s) => s.sort_order)) + 1
      : 1;

  const columns = [
    "Label",
    "Code",
    "Order",
    "Flags",
    "Active",
    ...(canEdit ? ["Actions"] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Statuses"
        description="Manage workflow statuses shown when updating client services"
      />

      <SearchSection
        searchValue={search}
        onSearchChange={setSearch}
        actionLabel="Add Status"
        onActionClick={openCreate}
        placeholder="Search statuses by label or code..."
      />

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? "Edit Status" : "Add Status"}
        description="Define a workflow status for client services"
        width="max-w-3xl"
      >
        <Formik
          initialValues={{
            code: editing?.code ?? "",
            label: editing?.label ?? "",
            sort_order: editing?.sort_order ?? nextSortOrder,
            requires_approval_effective_date:
              editing?.requires_approval_effective_date ?? false,
            is_terminal: editing?.is_terminal ?? false,
            is_active: editing?.is_active ?? true,
          }}
          validationSchema={editing ? EditStatusSchema : StatusSchema}
          enableReinitialize
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            try {
              if (editing) {
                await updateMutation.mutateAsync({
                  id: editing.id,
                  body: {
                    label: values.label,
                    sort_order: Number(values.sort_order),
                    requires_approval_effective_date:
                      values.requires_approval_effective_date,
                    is_terminal: values.is_terminal,
                    is_active: values.is_active,
                  },
                });
              } else {
                await createMutation.mutateAsync({
                  code: values.code.trim().toLowerCase(),
                  label: values.label,
                  sort_order: Number(values.sort_order),
                  requires_approval_effective_date:
                    values.requires_approval_effective_date,
                  is_terminal: values.is_terminal,
                  is_active: values.is_active,
                });
              }
              closeModal();
            } catch (err) {
              setStatus(err instanceof Error ? err.message : "Action failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, status, values, setFieldValue }) => (
            <Form className="space-y-6 font-lato">
              {status && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
                  {status}
                </div>
              )}

              <div className="space-y-5">
                {!editing && (
                  <TextLabelInput
                    label="Status Code *"
                    name="code"
                    placeholder="e.g. environmental_audit"
                  />
                )}
                {editing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status Code
                    </label>
                    <p className="text-sm font-mono bg-gray-100 rounded-lg px-3 py-2 text-gray-600">
                      {editing.code}
                    </p>
                  </div>
                )}

                <TextLabelInput
                  label="Display Label *"
                  name="label"
                  placeholder="e.g. Environmental audit"
                />

                <TextLabelInput
                  label="Sort Order *"
                  name="sort_order"
                  type="number"
                  placeholder="1"
                />

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={values.requires_approval_effective_date}
                    onChange={(e) =>
                      setFieldValue(
                        "requires_approval_effective_date",
                        e.target.checked,
                      )
                    }
                    className="rounded border-gray-300"
                  />
                  Requires approval effective date
                </label>
                <p className="text-xs text-gray-500 -mt-3">
                  When selected, staff must enter the approval effective date and validity is calculated.
                </p>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={values.is_terminal}
                    onChange={(e) => setFieldValue("is_terminal", e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Terminal status (locks service from further updates)
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={values.is_active}
                    onChange={(e) => setFieldValue("is_active", e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Active (visible in status dropdown)
                </label>
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
                      ? "Update Status"
                      : "Add Status"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </Modal>

      <Table
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading statuses..."
        emptyMessage="No service statuses found"
        emptyIcon={<FontAwesomeIcon icon={faListCheck} className="text-2xl" />}
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
              <span className="text-gray-700 font-medium">{s.label}</span>
            </td>
            <td className="px-5 py-4">
              <span className="text-sm font-mono px-2 py-1 bg-gray-100 rounded-lg text-gray-600">
                {s.code}
              </span>
            </td>
            <td className="px-5 py-4 text-sm text-gray-600">{s.sort_order}</td>
            <td className="px-5 py-4">
              <div className="flex flex-wrap gap-1">
                {s.requires_approval_effective_date && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Approval date
                  </span>
                )}
                {s.is_terminal && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    Terminal
                  </span>
                )}
              </div>
            </td>
            <td className="px-5 py-4">
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  s.is_active
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {s.is_active ? "Yes" : "No"}
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
        message={deleteTarget ? `Delete ${deleteTarget.label}?` : ""}
        warning="This will fail if any services or history use this status. Deactivate instead."
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
