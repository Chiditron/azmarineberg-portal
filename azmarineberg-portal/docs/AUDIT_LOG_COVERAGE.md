# Audit log coverage

This document lists which sensitive actions are recorded in the audit log and where in the codebase they are triggered.

## Audited actions

| Action | Entity type | Controller | Notes |
|--------|-------------|------------|--------|
| create_client | company | admin.controller.ts | Create company + facility + service + user |
| invite_client | company | admin.controller.ts | Send invite email |
| add_facility | facility | admin.controller.ts | Add facility to company |
| add_service | service | admin.controller.ts | Add service to company |
| create_regulator | regulator | admin.controller.ts | |
| update_regulator | regulator | admin.controller.ts | |
| delete_regulator | regulator | admin.controller.ts | |
| create_service_type | service_type | admin.controller.ts | |
| update_service_type | service_type | admin.controller.ts | |
| delete_service_type | service_type | admin.controller.ts | |
| create_user | user | users.controller.ts | |
| update_user | user | users.controller.ts | |
| create_industry_sector | industry_sector | industrySectors.controller.ts | |
| update_industry_sector | industry_sector | industrySectors.controller.ts | |
| delete_industry_sector | industry_sector | industrySectors.controller.ts | |
| update_service_status | service | services.controller.ts | Status + notes |
| upload_document | document | documents.controller.ts | After successful storage upload |

## Access control

- **List/filter audit logs:** `GET /api/dashboard/audit-logs` — restricted to authenticated users with role that can access dashboard (super_admin and admin via dashboard routes). Verify in dashboard.routes.ts and audit.controller.ts that only authorised roles can list logs.
- **Delete/edit logs:** Not exposed via API; audit_logs table should not be writable by app after insert.

## Retention

- Define retention period (e.g. 1 year) and document in operations runbook.
- Optional: periodic job to archive or purge old rows.
