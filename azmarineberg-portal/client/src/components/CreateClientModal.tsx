import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../services/api";
import {
  ZONES,
  getStatesByZone,
  getLgasByState,
} from "../data/nigerianLocations";
import { Formik, Form, FieldArray } from "formik";
import * as Yup from "yup";
import { TextLabelInput, SingleSelectInput, MyCheckbox } from "./ui/FormFields";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import Modal from "./ui/Modal";
import { useState } from "react";

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateClientSchema = Yup.object().shape({
  company_name: Yup.string().required("Required"),
  email: Yup.string().email("Invalid email").required("Required"),
  phone: Yup.string().required("Required"),
  address: Yup.string().required("Required"),
  zone: Yup.string().required("Required"),
  state: Yup.string().required("Required"),
  contact_person: Yup.string().required("Required"),
  industry_sector_id: Yup.string().required("Required"),
  facilities: Yup.array()
    .of(
      Yup.object().shape({
        facility_name: Yup.string().required("Required"),
        facility_address: Yup.string().required("Required"),
      }),
    )
    .min(1, "At least one facility is required"),
});

export default function CreateClientModal({
  open,
  onClose,
  onSuccess,
}: CreateClientModalProps) {
  const [createUserAndInvite, setCreateUserAndInvite] = useState(false);
  const { data: industrySectors } = useQuery({
    queryKey: ["industry-sectors"],
    queryFn: () =>
      api.get<{ id: string; name: string; code: string }[]>(
        "/admin/industry-sectors",
      ),
    enabled: open,
  });

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Create New Client"
      description="Register a new organization and invite them to the portal"
    >
      <Formik
        initialValues={{
          company_name: "",
          address: "",
          phone: "",
          email: "",
          contact_person: "",
          lga: "",
          state: "",
          zone: "",
          industry_sector_id: "",
          facilities: [
            {
              facility_name: "",
              facility_address: "",
              lga: "",
              state: "",
              zone: "",
            },
          ],
          createUserAndInvite: true,
        }}
        validationSchema={CreateClientSchema}
        onSubmit={async (values, { setSubmitting, setStatus }) => {
          if (!createUserAndInvite) {
            return toast.error("Please check the box to continue")
          }

          try {
            const payload = {
              ...values,
              lga: values.lga || values.state,
              facilities: values.facilities.map((f) => ({
                ...f,
                lga: f.lga || values.state,
                state: f.state || values.state,
                zone: f.zone || values.zone,
              })),
            };
            const res = await api.post<{
              companyId: string;
              inviteLink?: string;
            }>("/admin/clients", payload);
            if (res.inviteLink) {
              navigator.clipboard.writeText(res.inviteLink);
              toast.success(
                "Client created. Invite link copied to clipboard.",
                {
                  duration: 5000,
                },
              );
            } else {
              toast.success("Client created successfully.");
            }
            onSuccess();
            onClose();
          } catch (err) {
            setStatus(
              err instanceof Error ? err.message : "Failed to create client",
            );
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, setFieldValue, isSubmitting, status }) => (
          <Form className="space-y-6 font-lato">
            {status && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
                {status}
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              <div className="col-span-2">
                <TextLabelInput
                  label="Company Name *"
                  name="company_name"
                  placeholder="Azmarineberg Ltd"
                />
              </div>
              <TextLabelInput
                label="Email Address *"
                name="email"
                type="email"
                placeholder="client@company.com"
              />
              <TextLabelInput
                label="Phone Number *"
                name="phone"
                placeholder="+234..."
              />
              <div className="col-span-2">
                <TextLabelInput
                  label="Office Address *"
                  name="address"
                  placeholder="Full street address"
                />
              </div>

              <SingleSelectInput
                label="Geopolitical Zone *"
                name="zone"
                options={ZONES.map((z) => ({ value: z, label: z }))}
                onChange={(opt: any) => {
                  setFieldValue("zone", opt ? opt.value : "");
                  setFieldValue("state", "");
                  setFieldValue("lga", "");
                }}
              />

              <SingleSelectInput
                label="State *"
                name="state"
                disabled={!values.zone}
                options={getStatesByZone(values.zone).map((s) => ({
                  value: s,
                  label: s,
                }))}
                onChange={(opt: any) => {
                  setFieldValue("state", opt ? opt.value : "");
                  setFieldValue("lga", "");
                }}
              />

              <SingleSelectInput
                label="LGA"
                name="lga"
                disabled={!values.state || values.state === "Other"}
                options={getLgasByState(values.state).map((l) => ({
                  value: l,
                  label: l,
                }))}
              />

              <TextLabelInput
                label="Contact Person *"
                name="contact_person"
                placeholder="Full name of representative"
              />

              <div className="col-span-2">
                <SingleSelectInput
                  label="Industry Sector *"
                  name="industry_sector_id"
                  options={
                    industrySectors?.map((s) => ({
                      value: s.id,
                      label: s.name,
                    })) || []
                  }
                  isLoading={!industrySectors}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-poppins">
                    Facilities
                  </h4>
                  <p className="text-xs text-gray-500">
                    Add at least one operational facility
                  </p>
                </div>
                <FieldArray name="facilities">
                  {({ push }) => (
                    <button
                      type="button"
                      onClick={() =>
                        push({
                          facility_name: "",
                          facility_address: "",
                          lga: "",
                          state: "",
                          zone: "",
                        })
                      }
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg font-bold text-xs transition-all active:scale-95"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Add Facility
                    </button>
                  )}
                </FieldArray>
              </div>

              <FieldArray name="facilities">
                {({ remove }) => (
                  <div className="space-y-4">
                    {values.facilities.map((_, index) => (
                      <div
                        key={index}
                        className="p-5 border border-gray-100 rounded-2xl bg-gray-50/30 relative group"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Facility #{index + 1}
                          </span>
                          {values.facilities.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          )}
                        </div>
                        <div className="space-y-4">
                          <TextLabelInput
                            label="Facility Name"
                            name={`facilities.${index}.facility_name`}
                            placeholder="Warehouse A, etc."
                          />
                          <TextLabelInput
                            label="Facility Address"
                            name={`facilities.${index}.facility_address`}
                            placeholder="Full street address for this facility"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FieldArray>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={createUserAndInvite} onChange={(e) => setCreateUserAndInvite(e.target.checked)} />
                Create user account and generate invite link
              </label>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 font-poppins"
              >
                {isSubmitting ? "Creating Client..." : "Create Client"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
