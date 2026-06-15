import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  api,
  type ClientCompanyDetails,
  type ClientFacilityRow,
  type PatchClientCompanyBody,
  type UpdateClientFacilityBody,
} from '../services/api';
import { TextLabelInput, SingleSelectInput } from '../components/ui/FormFields';
import Modal from '../components/ui/Modal';
import {
  ZONES,
  getStatesByZone,
  getLgasByState,
} from '../data/nigerianLocations';

const CompanySchema = Yup.object({
  company_name: Yup.string().required('Required'),
  contact_person: Yup.string().required('Required'),
  address: Yup.string().required('Required'),
  phone: Yup.string(),
  zone: Yup.string(),
  state: Yup.string(),
  lga: Yup.string(),
});

const FacilitySchema = Yup.object({
  facility_name: Yup.string().required('Required'),
  facility_address: Yup.string().required('Required'),
  zone: Yup.string(),
  state: Yup.string(),
  lga: Yup.string(),
});

type FacilityModalState =
  | null
  | { type: 'add' }
  | { type: 'edit'; facility: ClientFacilityRow };

export default function ClientProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [facilityModal, setFacilityModal] = useState<FacilityModalState>(null);

  const { data: company, isLoading } = useQuery({
    queryKey: ['client-company'],
    queryFn: () => api.getClientCompany(),
  });

  const patchCompanyMutation = useMutation({
    mutationFn: (body: PatchClientCompanyBody) => api.patchClientCompany(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-company'] });
      toast.success('Profile updated');
      setIsEditing(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const invalidateCompany = () =>
    queryClient.invalidateQueries({ queryKey: ['client-company'] });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>
        <div className="animate-pulse h-48 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (!company) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>
        <p className="text-gray-500">No company details found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl md:text-2xl font-semibold text-gray-900">Profile</h2>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <FontAwesomeIcon icon={faPen} className="text-xs" />
            Edit profile
          </button>
        ) : null}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {!isEditing ? (
          <ProfileView company={company} />
        ) : (
          <Formik
            enableReinitialize
            initialValues={{
              company_name: company.company_name,
              email: company.email,
              phone: company.phone ?? '',
              contact_person: company.contact_person,
              address: company.address,
              lga: company.lga ?? '',
              state: company.state ?? '',
              zone: company.zone ?? '',
            }}
            validationSchema={CompanySchema}
            onSubmit={(values) => {
              const body: PatchClientCompanyBody = {
                company_name: values.company_name.trim(),
                contact_person: values.contact_person.trim(),
                address: values.address.trim(),
                phone: values.phone.trim() ? values.phone.trim() : null,
                lga: values.lga.trim() || null,
                state: values.state.trim() || null,
                zone: values.zone.trim() || null,
              };
              patchCompanyMutation.mutate(body);
            }}
          >
            {({ values, setFieldValue, isSubmitting }) => (
              <Form className="space-y-5">
                <h3 className="text-lg md:text-xl font-medium">Company details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2 sm:col-span-1">
                    <TextLabelInput label="Company name *" name="company_name" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-gray-800 font-semibold text-sm block mb-1" htmlFor="profile-email-readonly">
                      Email
                    </label>
                    <input
                      id="profile-email-readonly"
                      name="email"
                      type="email"
                      value={values.email}
                      disabled
                      className="block w-full border border-gray-200 bg-gray-50 text-gray-600 h-12 rounded-md px-3 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Contact support to change your login email.
                    </p>
                  </div>
                  <TextLabelInput label="Phone" name="phone" placeholder="+234…" />
                  <TextLabelInput label="Contact person *" name="contact_person" />
                  <div className="col-span-2">
                    <TextLabelInput label="Office address *" name="address" />
                  </div>
                  <SingleSelectInput
                    label="Geopolitical zone"
                    name="zone"
                    options={ZONES.map((z) => ({ value: z, label: z }))}
                    onChange={() => {
                      setFieldValue('state', '');
                      setFieldValue('lga', '');
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
                    onChange={() => setFieldValue('lga', '')}
                  />
                  <SingleSelectInput
                    label="LGA"
                    name="lga"
                    disabled={!values.state || values.state === 'Other'}
                    options={getLgasByState(values.state).map((l) => ({
                      value: l,
                      label: l,
                    }))}
                  />
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-gray-800 font-semibold text-sm block mb-1" htmlFor="profile-sector-readonly">
                      Industry sector
                    </label>
                    <input
                      id="profile-sector-readonly"
                      type="text"
                      value={company.industry_sector?.trim() ? company.industry_sector : 'Not set'}
                      disabled
                      className="block w-full border border-gray-200 bg-gray-50 text-gray-600 h-12 rounded-md px-3 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Contact support to change your industry sector.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || patchCompanyMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    {patchCompanyMutation.isPending ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 text-sm font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        )}

        <FacilitiesBlock
          company={company}
          isEditing={isEditing}
          setFacilityModal={setFacilityModal}
          onInvalidate={invalidateCompany}
        />
      </div>

      <FacilityModal
        state={facilityModal}
        onClose={() => setFacilityModal(null)}
        company={company}
        onSuccess={() => {
          invalidateCompany();
          setFacilityModal(null);
        }}
      />
    </div>
  );
}

function ProfileView({ company }: { company: ClientCompanyDetails }) {
  return (
    <>
      <h3 className="text-lg md:text-xl font-medium mb-4">{company.company_name}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 items-start">
        <p className="text-gray-600">
          <span className="font-semibold text-gray-800">Email:</span> {company.email}
        </p>
        {company.phone ? (
          <p className="text-gray-600">
            <span className="font-semibold text-gray-800">Phone:</span> {company.phone}
          </p>
        ) : null}
        <p className="text-gray-600">
          <span className="font-semibold text-gray-800">Contact Person:</span>{' '}
          {company.contact_person}
        </p>
        <p className="text-gray-600">
          <span className="font-semibold text-gray-800">Address:</span> {company.address}
        </p>
        {company.lga ? (
          <p className="text-gray-600">
            <span className="font-semibold text-gray-800">LGA:</span> {company.lga}
          </p>
        ) : null}
        {company.state ? (
          <p className="text-gray-600">
            <span className="font-semibold text-gray-800">State:</span> {company.state}
          </p>
        ) : null}
        {company.zone ? (
          <p className="text-gray-600">
            <span className="font-semibold text-gray-800">Zone:</span> {company.zone}
          </p>
        ) : null}
        {company.industry_sector ? (
          <p className="text-gray-600">
            <span className="font-semibold text-gray-800">Sector:</span> {company.industry_sector}
          </p>
        ) : null}
      </div>
    </>
  );
}

function FacilitiesBlock({
  company,
  isEditing,
  setFacilityModal,
  onInvalidate,
}: {
  company: ClientCompanyDetails;
  isEditing: boolean;
  setFacilityModal: (s: FacilityModalState) => void;
  onInvalidate: () => void;
}) {
  const list = company.facilities ?? [];

  const handleDelete = async (f: ClientFacilityRow) => {
    if (!window.confirm(`Remove facility "${f.facility_name}"?`)) return;
    try {
      await api.deleteClientFacility(f.id);
      toast.success('Facility removed');
      onInvalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove facility');
    }
  };

  return (
    <div className="mt-8 pt-5 border-t">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h4 className="text-lg md:text-xl font-medium text-gray-800">
          Facilities ({list.length})
        </h4>
        {isEditing ? (
          <button
            type="button"
            onClick={() => setFacilityModal({ type: 'add' })}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
            Add facility
          </button>
        ) : null}
      </div>
      {list.length === 0 ? (
        <p className="text-gray-500 text-sm">
          {isEditing
            ? 'No facilities yet. Add one with the button above.'
            : 'No facilities listed.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((f) => (
            <div
              key={f.id}
              className="bg-gray-50 rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <p className="text-lg font-medium text-gray-900">{f.facility_name}</p>
                <p className="text-gray-600 text-sm">{f.facility_address}</p>
                {(f.lga || f.state || f.zone) && (
                  <p className="text-gray-500 text-xs mt-1">
                    {[f.lga, f.state, f.zone].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              {isEditing ? (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFacilityModal({ type: 'edit', facility: f })}
                    className="px-2 py-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f)}
                    className="px-2 py-1 text-xs font-semibold text-red-600 hover:underline inline-flex items-center gap-1"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FacilityModal({
  state,
  onClose,
  company,
  onSuccess,
}: {
  state: FacilityModalState;
  onClose: () => void;
  company: ClientCompanyDetails;
  onSuccess: () => void;
}) {
  const open = state !== null;
  const isEdit = state?.type === 'edit';
  const facility = state?.type === 'edit' ? state.facility : null;

  const createMutation = useMutation({
    mutationFn: api.createClientFacility,
    onSuccess: () => {
      toast.success('Facility added');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateClientFacilityBody }) =>
      api.updateClientFacility(id, body),
    onSuccess: () => {
      toast.success('Facility updated');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const title = isEdit ? 'Edit facility' : 'Add facility';

  return (
    <Modal isOpen={open} onClose={onClose} title={title} width="max-w-lg">
      {open && (
        <Formik
          enableReinitialize
          initialValues={{
            facility_name: facility?.facility_name ?? '',
            facility_address: facility?.facility_address ?? '',
            zone: facility?.zone ?? company.zone ?? '',
            state: facility?.state ?? company.state ?? '',
            lga: facility?.lga ?? company.lga ?? '',
          }}
          validationSchema={FacilitySchema}
          onSubmit={(values) => {
            const lga = values.lga.trim() || values.state.trim() || undefined;
            const stateVal = values.state.trim() || undefined;
            const zoneVal = values.zone.trim() || undefined;
            if (isEdit && facility) {
              updateMutation.mutate({
                id: facility.id,
                body: {
                  facility_name: values.facility_name.trim(),
                  facility_address: values.facility_address.trim(),
                  lga: lga ?? null,
                  state: stateVal ?? null,
                  zone: zoneVal ?? null,
                },
              });
            } else {
              createMutation.mutate({
                facility_name: values.facility_name.trim(),
                facility_address: values.facility_address.trim(),
                lga,
                state: stateVal,
                zone: zoneVal,
              });
            }
          }}
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form className="space-y-4 pt-2">
              <TextLabelInput label="Facility name *" name="facility_name" />
              <TextLabelInput label="Facility address *" name="facility_address" />
              <SingleSelectInput
                label="Geopolitical zone"
                name="zone"
                options={ZONES.map((z) => ({ value: z, label: z }))}
                onChange={() => {
                  setFieldValue('state', '');
                  setFieldValue('lga', '');
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
                onChange={() => setFieldValue('lga', '')}
              />
              <SingleSelectInput
                label="LGA"
                name="lga"
                disabled={!values.state || values.state === 'Other'}
                options={getLgasByState(values.state).map((l) => ({
                  value: l,
                  label: l,
                }))}
              />
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={
                    isSubmitting || createMutation.isPending || updateMutation.isPending
                  }
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving…'
                    : isEdit
                      ? 'Save facility'
                      : 'Add facility'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </Form>
          )}
        </Formik>
      )}
    </Modal>
  );
}
