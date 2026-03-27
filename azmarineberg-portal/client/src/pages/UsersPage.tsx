import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import Table from "../components/ui/Table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle, faEdit } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "../components/ui/PageHeader";
import SearchSection from "../components/ui/SearchSection";
import Modal from "../components/ui/Modal";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { TextLabelInput, SingleSelectInput } from "../components/ui/FormFields";

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

const CreateUserSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(8, "Too short").required("Required"),
  role: Yup.string().required("Required"),
  first_name: Yup.string(),
  last_name: Yup.string(),
  phone: Yup.string(),
});

const EditUserSchema = Yup.object().shape({
  role: Yup.string().required("Required"),
  first_name: Yup.string(),
  last_name: Yup.string(),
  phone: Yup.string(),
});

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<User[]>("/admin/users"),
  });

  const filtered = users?.filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.first_name + " " + u.last_name)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post<User>("/admin/users", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) =>
      api.put<User>(`/admin/users/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditing(null);
    },
  });

  const columns = ["Name", "Email", "Phone", "Role", "Created", "Action"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage portal administrators, staff, and their access levels"
      />

      <SearchSection
        searchValue={search}
        onSearchChange={setSearch}
        actionLabel="Add User"
        onActionClick={() => setShowCreate(true)}
        placeholder="Search users by name or email..."
      />

      {/* Create User Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add New User"
        description="Create a new administrative account"
        width="max-w-3xl"
      >
        <Formik
          initialValues={{
            email: "",
            password: "",
            role: "staff",
            first_name: "",
            last_name: "",
            phone: "",
          }}
          validationSchema={CreateUserSchema}
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            try {
              await createMutation.mutateAsync(values);
              setShowCreate(false);
            } catch (err) {
              setStatus(err instanceof Error ? err.message : "Creation failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, status }) => (
            <Form className="space-y-5 font-lato">
              {status && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
                  {status}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <TextLabelInput
                  label="First Name"
                  name="first_name"
                  placeholder="John"
                />
                <TextLabelInput
                  label="Last Name"
                  name="last_name"
                  placeholder="Doe"
                />
              </div>
              <TextLabelInput
                label="Email Address *"
                name="email"
                type="email"
                placeholder="user@azmarineberg.com"
              />
              <TextLabelInput
                label="Password *"
                name="password"
                type="password"
                placeholder="••••••••"
              />
              <TextLabelInput
                label="Phone Number"
                name="phone"
                placeholder="+234..."
              />
              <SingleSelectInput
                label="Role *"
                name="role"
                options={[
                  { value: "super_admin", label: "Super Admin" },
                  { value: "admin", label: "Admin" },
                  { value: "staff", label: "Staff" },
                ]}
              />
              <div className="pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary text-white rounded-xl font-bold font-poppins shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Edit User"
        description={`Updating access for ${editing?.email}`}
        width="max-w-3xl"
      >
        <Formik
          initialValues={{
            role: editing?.role ?? "staff",
            first_name: editing?.first_name ?? "",
            last_name: editing?.last_name ?? "",
            phone: editing?.phone ?? "",
          }}
          validationSchema={EditUserSchema}
          enableReinitialize
          onSubmit={async (values, { setSubmitting, setStatus }) => {
            try {
              if (editing) {
                await updateMutation.mutateAsync({
                  id: editing.id,
                  body: values,
                });
              }
              setEditing(null);
            } catch (err) {
              setStatus(err instanceof Error ? err.message : "Update failed");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, status }) => (
            <Form className="space-y-5 font-lato">
              {status && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
                  {status}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <TextLabelInput label="First Name" name="first_name" />
                <TextLabelInput label="Last Name" name="last_name" />
              </div>
              <TextLabelInput label="Phone Number" name="phone" />
              <SingleSelectInput
                label="Role *"
                name="role"
                options={[
                  { value: "super_admin", label: "Super Admin" },
                  { value: "admin", label: "Admin" },
                  { value: "staff", label: "Staff" },
                ]}
              />
              <div className="pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary text-white rounded-xl font-bold font-poppins shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
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
                Loading users...
              </p>
            </div>
          ) : !filtered?.length ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <FontAwesomeIcon icon={faUserCircle} className="text-2xl" />
              </div>
              <p className="text-gray-500 font-bold font-poppins">
                No users found
              </p>
            </div>
          ) : (
            <Table columns={columns}>
              {filtered.map((u, index) => (
                <tr
                  key={u.id}
                  className="hover:bg-blue-50/30 transition-colors border-b border-gray-50 last:border-0 font-lato"
                >
                  <td className="px-5 py-4 text-sm font-semibold text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-5 py-4 text-gray-900">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-5 py-4 text-gray-600 font-medium">
                    {u.email}
                  </td>
                  <td className="px-5 py-4 text-gray-600">
                    {u.phone ?? "-"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="capitalize px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-bold text-gray-600 uppercase tracking-wider">
                      {u.role?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 font-medium">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-sm">
                    <button
                      onClick={() => setEditing(u)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                      title="Edit"
                    >
                      <FontAwesomeIcon icon={faEdit} className="text-xs" />
                    </button>
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
