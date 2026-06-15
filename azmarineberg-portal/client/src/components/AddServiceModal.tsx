import { useQuery } from "@tanstack/react-query";
import { Formik, Form, useFormikContext } from "formik";
import * as Yup from "yup";
import { api } from "../services/api";
import Modal from "./ui/Modal";
import { SingleSelectInput, TextLabelInput } from "./ui/FormFields";
import { formatValidityPeriod } from "../utils/formatValidityPeriod";

interface Facility {
  id: string;
  facility_name: string;
  facility_address: string;
}

interface Regulator {
  id: string;
  name: string;
  code: string;
}

interface ServiceType {
  id: string;
  name: string;
  code: string;
  regulator_id: string;
  validity_count?: number | null;
  validity_unit?: string | null;
}

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  facilities: Facility[];
}

const AddServiceSchema = Yup.object().shape({
  facility_id: Yup.string().required("Facility is required"),
  regulator_id: Yup.string().required("Regulator is required"),
  service_type_id: Yup.string().required("Service type is required"),
  service_description: Yup.string(),
});

interface FormValues {
  facility_id: string;
  regulator_id: string;
  service_type_id: string;
  service_description: string;
}

function AddServiceForm({
  facilities,
  regulators,
}: {
  facilities: Facility[];
  regulators: Regulator[] | undefined;
}) {
  const { values, setFieldValue, isSubmitting, status } =
    useFormikContext<FormValues>();

  const { data: serviceTypes } = useQuery({
    queryKey: ["service-types", values.regulator_id],
    queryFn: () =>
      api.get<ServiceType[]>(
        `/admin/service-types?regulatorId=${values.regulator_id}`,
      ),
    enabled: !!values.regulator_id,
  });

  const selectedSt = (serviceTypes ?? []).find(
    (s) => s.id === values.service_type_id,
  );

  return (
    <Form className="space-y-5 font-lato">
      {status && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
          {status}
        </div>
      )}

      <SingleSelectInput
        label="Facility *"
        name="facility_id"
        options={facilities.map((f) => ({
          value: f.id,
          label: f.facility_name,
        }))}
      />

      <SingleSelectInput
        label="Regulator *"
        name="regulator_id"
        options={(regulators ?? []).map((r) => ({
          value: r.id,
          label: `${r.name} (${r.code})`,
        }))}
        onChange={() => setFieldValue("service_type_id", "")}
      />

      <SingleSelectInput
        label="Service Type *"
        name="service_type_id"
        disabled={!values.regulator_id}
        options={(serviceTypes ?? []).map((s) => ({
          value: s.id,
          label:
            s.validity_count != null && s.validity_unit
              ? `${s.name} (${s.code}) · ${formatValidityPeriod(s.validity_count, s.validity_unit)}`
              : `${s.name} (${s.code})`,
        }))}
      />

      {selectedSt &&
        selectedSt.validity_count != null &&
        selectedSt.validity_unit && (
          <p className="text-sm text-gray-600 -mt-2">
            Regulatory validity will run for{" "}
            <span className="font-semibold text-gray-800">
              {formatValidityPeriod(
                selectedSt.validity_count,
                selectedSt.validity_unit,
              )}
            </span>{" "}
            starting from the approval effective date (set when the service is
            approved).
          </p>
        )}

      <TextLabelInput
        label="Description"
        name="service_description"
        placeholder="Brief service description (optional)"
      />

      <div className="pt-6 border-t border-gray-100">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 font-poppins"
        >
          {isSubmitting ? "Adding Service..." : "Add Service"}
        </button>
      </div>
    </Form>
  );
}

export default function AddServiceModal({
  open,
  onClose,
  onSuccess,
  companyId,
  facilities,
}: AddServiceModalProps) {
  const { data: regulators } = useQuery({
    queryKey: ["regulators"],
    queryFn: () => api.get<Regulator[]>("/admin/regulators"),
    enabled: open,
  });

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Add Service"
      description="Assign a new regulatory service to this client"
      width="max-w-3xl"
    >
      <Formik
        initialValues={{
          facility_id: facilities?.[0]?.id ?? "",
          regulator_id: "",
          service_type_id: "",
          service_description: "",
        }}
        validationSchema={AddServiceSchema}
        enableReinitialize
        onSubmit={async (values, { setSubmitting, setStatus }) => {
          try {
            const serviceTypesRes = await api.get<ServiceType[]>(
              `/admin/service-types?regulatorId=${values.regulator_id}`,
            );
            const st = serviceTypesRes?.find(
              (s) => s.id === values.service_type_id,
            );
            await api.post("/admin/services", {
              facility_id: values.facility_id,
              company_id: companyId,
              service_type_id: values.service_type_id,
              regulator_id: values.regulator_id,
              service_description:
                values.service_description || (st?.name ?? ""),
              service_code: st?.code ?? "N/A",
              status: "draft",
            });
            onSuccess();
            onClose();
          } catch (err) {
            setStatus(
              err instanceof Error ? err.message : "Failed to add service",
            );
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <AddServiceForm facilities={facilities} regulators={regulators} />
      </Formik>
    </Modal>
  );
}
