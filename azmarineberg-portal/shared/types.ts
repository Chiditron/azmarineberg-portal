export type UserRole = 'super_admin' | 'admin' | 'staff' | 'client';

export type ServiceStatus =
  | 'draft'
  | 'site_visit'
  | 'report_preparation'
  | 'submission'
  | 'approved'
  | 'closed';

export type ReportCycleStatus =
  | 'pending'
  | 'site_visit_done'
  | 'report_prepared'
  | 'submitted'
  | 'acknowledged';

export type ReportCycleType = 'monthly' | 'quarterly' | 'annual';

export type DocumentType =
  | 'client_upload'
  | 'azmarineberg_upload'
  | 'certificate'
  | 'acknowledged_submission';

export type AlertType =
  | '3_months'
  | '1_month'
  | '2_weeks'
  | '7_days'
  | '3_days';

export type ClosedReason = 'expired' | 'renewed' | null;

export interface User {
  id: string;
  email: string;
  role: UserRole;
  company_id: string | null;
  created_at: Date;
}

export interface Company {
  id: string;
  company_name: string;
  address: string;
  phone: string;
  email: string;
  contact_person: string;
  lga: string;
  state: string;
  zone: string;
  industry_sector: string;
  created_at: Date;
  updated_at: Date;
}

export interface Facility {
  id: string;
  company_id: string;
  facility_name: string;
  facility_address: string;
  lga: string;
  state: string;
  zone: string;
  created_at: Date;
}

export interface Regulator {
  id: string;
  name: string;
  code: string;
  level: 'federal' | 'state';
  created_at: Date;
}

export interface ServiceType {
  id: string;
  name: string;
  code: string;
  regulator_id: string;
  created_at: Date;
}

export interface Service {
  id: string;
  facility_id: string;
  company_id: string;
  service_type_id: string;
  regulator_id: string;
  service_description: string;
  service_code: string;
  validity_start: Date;
  validity_end: Date;
  status: ServiceStatus;
  documents_required: string[];
  closed_reason: ClosedReason;
  renewed_from_service_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  service_id: string;
  file_name: string;
  s3_key: string;
  version: number;
  document_type: DocumentType;
  uploaded_by_role: UserRole;
  uploaded_by_id: string;
  created_at: Date;
}
