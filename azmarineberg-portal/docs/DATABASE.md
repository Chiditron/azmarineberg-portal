# Database Documentation

## Overview

The application uses **PostgreSQL**. The schema and migrations are in `server/src/db/`. The application connects via a single connection pool (`server/src/db/pool.js`) and does not use an ORM; queries are raw SQL.

## Schema and Migrations

- **Base schema:** `server/src/db/schema.sql` – creates all core tables and indexes. Run first.
- **Migrations:** `server/src/db/migrations/` – SQL files run in **lexicographic order** after the base schema. Naming convention: `001_*.sql`, `002_*.sql`, etc.
- **Runner:** `server/src/db/migrate.ts` – reads `schema.sql`, executes it, then reads the migrations directory, sorts by filename, and runs each `.sql` file. There is no version table; re-running will re-apply schema and migrations (use idempotent statements like `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` where possible).

Current migrations:

- `001_industry_sectors.sql` – Creates `industry_sectors`, adds `industry_sector_id` to `companies`, seeds sectors, backfills from `industry_sector` text.
- `002_users_profile_fields.sql` – Adds `first_name`, `last_name`, `phone` to `users`.
- `003_messages.sql` – Creates `messages` table and indexes.

## Main Entities and Relationships

```mermaid
erDiagram
  users ||--o{ companies : "company_id"
  companies ||--o{ facilities : "company_id"
  facilities ||--o{ services : "facility_id"
  companies ||--o{ services : "company_id"
  regulators ||--o{ service_types : "regulator_id"
  service_types ||--o{ services : "service_type_id"
  regulators ||--o{ services : "regulator_id"
  services ||--o{ documents : "service_id"
  services ||--o{ report_cycles : "service_id"
  report_cycles ||--o{ report_submissions : "report_cycle_id"
  users ||--o{ notifications : "user_id"
  users ||--o{ audit_logs : "actor_id"
  invite_tokens }o--|| companies : "company_id"
  messages }o--|| users : "sender_id, recipient_id"
  companies }o--o{ industry_sectors : "industry_sector_id"
```

### Tables (summary)

| Table | Purpose |
|-------|---------|
| **users** | All users; `role` in ('super_admin','admin','staff','client'); `company_id` FK to companies (null for staff/admin/super_admin). |
| **companies** | Client companies (consultancy’s clients). Optional `industry_sector_id` FK to industry_sectors. |
| **facilities** | Facilities belonging to a company. |
| **regulators** | Regulator definitions (federal/state). |
| **service_types** | Type of service (per regulator). |
| **services** | A service (permit, etc.) for a facility/company; has validity, status, documents_required (JSONB). |
| **service_status_history** | History of service status changes. |
| **documents** | File metadata; `s3_key` points to object in storage; `service_id` links to service. |
| **report_cycles** | Reporting cycles (monthly/quarterly/annual) per service. |
| **report_submissions** | Submissions for a cycle; optional link to document. |
| **expiry_alerts** | Alerts sent for upcoming expiries. |
| **notifications** | In-app notifications per user. |
| **audit_logs** | Actor, action, entity_type, entity_id, changes (JSONB), ip. |
| **invite_tokens** | Token for client invite; links to company and optionally user. |
| **messages** | One row per recipient; subject, body, parent_id for threads. |
| **industry_sectors** | Lookup for company sector. |

### Multi-Tenancy (company_id)

- **users:** Client users have `company_id` set; staff/admin/super_admin typically have null.
- **companies:** Each row is one “client company” (tenant from the consultancy’s perspective).
- **facilities, services:** Always have `company_id` (or inherit via facility → company). All client-scoped queries filter by `req.user.companyId`.
- **documents:** Isolated via `services.company_id` (document belongs to service → company).
- **report_cycles, report_submissions:** Isolated via service → company.

Indexes exist on `services(company_id)`, `documents(service_id)`, `report_cycles(service_id)`, and others as defined in `schema.sql` and migrations.

## Local Setup

- **Docker:** From repo root, `docker-compose up -d` starts PostgreSQL (and optionally Redis, MinIO). Default port 5432 (or 5433 mapped in compose); use the same in `DATABASE_URL`.
- **Connection:** Set `DATABASE_URL` in `server/.env`, e.g. `postgresql://user:pass@localhost:5432/azmarineberg_portal`.
- **Run migrations:** From repo root: `npm run db:migrate` (or from server: `npm run db:migrate` if script is defined). This runs the migrate script that applies `schema.sql` and all migration files.

## How to Add a Migration

1. Create a new file in `server/src/db/migrations/` with a name that sorts after the last one, e.g. `004_add_my_table.sql`.
2. Write idempotent SQL where possible: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, etc.
3. Run `npm run db:migrate` (from root or server). The migrate script runs all `.sql` files in sorted order; there is no separate “migration history” table, so new files are run on the next migrate.
