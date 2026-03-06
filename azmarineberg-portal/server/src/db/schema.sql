-- Azmarineberg Portal Database Schema

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff', 'client')),
  company_id UUID,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite tokens
CREATE TABLE IF NOT EXISTS invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  lga VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zone VARCHAR(50) NOT NULL,
  industry_sector VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facilities
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  facility_name VARCHAR(255) NOT NULL,
  facility_address TEXT NOT NULL,
  lga VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zone VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regulators
CREATE TABLE IF NOT EXISTS regulators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  level VARCHAR(20) NOT NULL CHECK (level IN ('federal', 'state')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service types
CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  regulator_id UUID NOT NULL REFERENCES regulators(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES service_types(id),
  regulator_id UUID NOT NULL REFERENCES regulators(id),
  service_description TEXT NOT NULL,
  service_code VARCHAR(50) NOT NULL,
  validity_start DATE NOT NULL,
  validity_end DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'site_visit', 'report_preparation', 'submission', 'approved', 'closed')),
  documents_required JSONB DEFAULT '[]',
  closed_reason VARCHAR(20) CHECK (closed_reason IN ('expired', 'renewed')),
  renewed_from_service_id UUID REFERENCES services(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service status history
CREATE TABLE IF NOT EXISTS service_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('client_upload', 'azmarineberg_upload', 'certificate', 'acknowledged_submission')),
  uploaded_by_role VARCHAR(50) NOT NULL,
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report cycles
CREATE TABLE IF NOT EXISTS report_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  cycle_type VARCHAR(20) NOT NULL CHECK (cycle_type IN ('monthly', 'quarterly', 'annual')),
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'site_visit_done', 'report_prepared', 'submitted', 'acknowledged')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report submissions (acknowledged copies)
CREATE TABLE IF NOT EXISTS report_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_cycle_id UUID NOT NULL REFERENCES report_cycles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ
);

-- Expiry alerts
CREATE TABLE IF NOT EXISTS expiry_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  alert_sent_at TIMESTAMPTZ DEFAULT NOW(),
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('3_months', '1_month', '2_weeks', '7_days', '3_days')),
  notified_client BOOLEAN DEFAULT false,
  notified_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications (in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add company_id FK to users after companies exists (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_company') THEN
    ALTER TABLE users ADD CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_services_company_id ON services(company_id);
CREATE INDEX IF NOT EXISTS idx_services_facility_id ON services(facility_id);
CREATE INDEX IF NOT EXISTS idx_services_validity_end ON services(validity_end);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_documents_service_id ON documents(service_id);
CREATE INDEX IF NOT EXISTS idx_report_cycles_service_id ON report_cycles(service_id);
CREATE INDEX IF NOT EXISTS idx_report_cycles_due_date ON report_cycles(due_date);
CREATE INDEX IF NOT EXISTS idx_expiry_alerts_service_id ON expiry_alerts(service_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON invite_tokens(expires_at);
