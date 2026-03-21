import { Formik, Form } from "formik";
import * as Yup from "yup";
import { api } from "../services/api";
import {
  ZONES,
  getStatesByZone,
  getLgasByState,
} from "../data/nigerianLocations";
import Modal from "./ui/Modal";
import { TextLabelInput, SingleSelectInput } from "./ui/FormFields";

interface AddFacilityModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  companyAddress?: string;
  companyLga?: string;
  companyState?: string;
  companyZone?: string;
}

const AddFacilitySchema = Yup.object().shape({
  facility_name: Yup.string().required("Facility name is required"),
  facility_address: Yup.string().required("Facility address is required"),
  zone: Yup.string(),
  state: Yup.string(),
  lga: Yup.string(),
});

export default function AddFacilityModal({
  open,
  onClose,
  onSuccess,
  companyId,
  companyAddress = "",
  companyLga = "",
  companyState = "",
  companyZone = "",
}: AddFacilityModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Add Facility"
      description="Register a new operational facility for this client"
      width="max-w-3xl"
    >
      <Formik
        initialValues={{
          facility_name: "",
          facility_address: companyAddress,
          zone: companyZone || "",
          state: companyState || "",
          lga: companyLga || "",
        }}
        validationSchema={AddFacilitySchema}
        enableReinitialize
        onSubmit={async (values, { setSubmitting, setStatus }) => {
          try {
            await api.post(`/admin/clients/${companyId}/facilities`, {
              facility_name: values.facility_name.trim(),
              facility_address: values.facility_address.trim(),
              lga: values.lga || values.state || undefined,
              state: values.state || undefined,
              zone: values.zone || undefined,
            });
            onSuccess();
            onClose();
          } catch (err) {
            setStatus(
              err instanceof Error ? err.message : "Failed to add facility",
            );
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, setFieldValue, isSubmitting, status }) => (
          <Form className="space-y-5 font-lato">
            {status && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
                {status}
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <TextLabelInput
                  label="Facility Name *"
                  name="facility_name"
                  placeholder="e.g. Lagos Warehouse A"
                />
              </div>

              <div className="col-span-2">
                <TextLabelInput
                  label="Facility Address *"
                  name="facility_address"
                  placeholder="Full street address for this facility"
                />
              </div>

              <SingleSelectInput
                label="Geopolitical Zone"
                name="zone"
                options={ZONES.map((z) => ({ value: z, label: z }))}
                onChange={(opt) => {
                  setFieldValue("zone", opt ? opt.value : "");
                  setFieldValue("state", "");
                  setFieldValue("lga", "");
                }}
              />

              <SingleSelectInput
                label="State"
                name="state"
                disabled={!values.zone}
                options={getStatesByZone(values.zone).map((s) => ({
                  value: s,
                  label: s,
                }))}
                onChange={(opt) => {
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
            </div>

            <div className="pt-6 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 font-poppins"
              >
                {isSubmitting ? "Adding Facility..." : "Add Facility"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
