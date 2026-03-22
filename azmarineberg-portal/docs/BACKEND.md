# Backend Documentation

## Tech Stack

- **Node.js** with **Express**
- **TypeScript** (compiled to `dist/`, run with `node dist/index.js` or `tsx` in dev)
- **PostgreSQL** – via `pg` (connection pool in `db/pool.js`)
- **Redis** – optional, for refresh tokens/session if configured
- **JWT** – access and refresh tokens; **bcrypt** for password hashing
- **Multer** – file uploads (memory storage, 20MB limit)
- **Nodemailer** – email (invites, notifications)
- **express-validator** – request validation
- **Helmet**, **cors**, **express-rate-limit** – security and CORS

## Project Structure

```
server/
├── src/
│   ├── controllers/    # Request handlers (auth, admin, clients, documents, services, etc.)
│   ├── services/       # Business logic and external services (auth.service, storage.service)
│   ├── routes/         # Express routers (auth, clients, admin, documents, services, reports, messages, notifications, dashboard)
│   ├── middleware/     # auth.ts, validate.ts
│   ├── db/             # pool.js, schema.sql, migrate.ts, migrations/, seed
│   ├── jobs/           # Cron (expiry notifications, report reminders)
│   ├── shared-types.ts # UserRole, etc.
│   └── index.ts        # Express app, route mounting, CORS, rate limits
├── .env.example
└── package.json
```

## Environment Variables

Documented in `server/.env.example`. Summary:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `PORT` | Server port (default 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (optional) |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `JWT_ACCESS_EXPIRY` | e.g. 15m |
| `JWT_REFRESH_EXPIRY` | e.g. 7d |
| `STORAGE_TYPE` | `local` or anything else for S3-compatible |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_USE_SSL` | S3/MinIO/R2 config |
| `SMTP_*`, `SMTP_FROM` | Nodemailer (invites, etc.) |
| `APP_URL` | Frontend URL (for invite links) |
| `RENDER_EXTERNAL_URL` or `API_URL` | Backend’s own URL (for document serve links); Render sets `RENDER_EXTERNAL_URL` |

## How to Run

- **Install:** `cd server && npm install`
- **Env:** Copy `server/.env.example` to `server/.env` and fill in values.
- **DB:** Ensure PostgreSQL is running; run migrations: `npm run db:migrate` (from repo root or server).
- **Seed (optional):** `npm run db:seed` – creates super admin and sample data.
- **Dev:** `npm run dev` (e.g. `tsx watch src/index.ts`) or from root `npm run dev`.
- **Production:** `npm run build` then `node dist/index.js`.

## Authentication

### JWT and middleware

- **Access token:** Short-lived, sent in `Authorization: Bearer <token>`. Payload includes `userId`, `email`, `role`, `companyId`.
- **Refresh token:** Longer-lived, stored (e.g. Redis or DB); used at `POST /api/auth/refresh` to issue a new access and refresh token.

Middleware in `server/src/middleware/auth.ts`:

- **authenticate** – Reads Bearer token, verifies JWT, sets `req.user` (AuthPayload). Returns 401 if missing or invalid.
- **requireRoles(...roles)** – Use after `authenticate`; returns 403 if `req.user.role` is not in the list.
- **requireSuperAdmin** – `requireRoles('super_admin')`
- **requireAdminOrAbove** – `requireRoles('super_admin', 'admin')`
- **requireStaffOrAbove** – `requireRoles('super_admin', 'admin', 'staff')`
- **requireClient** – `requireRoles('client')`

### Company scoping

- `req.user.companyId` is set from the JWT (from `users.company_id`). Client users have a non-null `companyId`; staff/admin/super_admin may have null.
- Client-facing routes (e.g. `/api/clients/*`) use `requireClient` and then filter all data by `req.user.companyId`.
- Admin routes (`/api/admin/*`) use `requireStaffOrAbove` or `requireAdminOrAbove` or `requireSuperAdmin` and operate on companies by ID (no automatic filter by `companyId`); documents and services still enforce that the client can only access their own company’s data when they hit shared endpoints.

## API Route Map

| Prefix | Auth | Description |
|--------|------|-------------|
| `/api/auth` | Mixed | login, refresh, logout, accept-invite (GET + POST), change-password |
| `/api/auth/me` | authenticate | Current user (mounted in index.ts) |
| `/api/clients` | authenticate, requireClient | dashboard/stats, company, services |
| `/api/admin` | authenticate + role per route | clients, facilities, services, regulators, service-types, industry-sectors, users, report, report/export |
| `/api/dashboard` | authenticate, requireSuperAdmin | metrics, audit-logs |
| `/api/documents` | authenticate | list by service, serve (by key), download-url, upload |
| `/api/services` | authenticate | get by id, patch status |
| `/api/reports` | authenticate | report cycles and submissions (see reports routes) |
| `/api/notifications` | authenticate | list, unread-count, mark read |
| `/api/messages` | authenticate | list, get, send, mark read, recipients (staff/clients) |
| `/api/health` | None | Health check |

Detailed route files:

- `auth.routes.ts` – POST login, refresh, logout; GET/POST accept-invite; POST change-password
- `clients.routes.ts` – GET dashboard/stats, company, services (all requireClient)
- `admin.routes.ts` – GET/POST clients, clients/:id, facilities, services; GET/POST/PUT/DELETE regulators, service-types; GET/POST/PUT/DELETE industry-sectors; GET/POST/PUT users; GET report, report/export
- `dashboard.routes.ts` – GET metrics, audit-logs (requireSuperAdmin)
- `documents.routes.ts` – GET service/:serviceId, serve, :id/download-url; POST service/:serviceId/upload
- `services.routes.ts` – GET :id, PATCH :id/status
- `reports.routes.ts` – report cycles and submissions
- `notifications.routes.ts` – list, unread-count, mark read
- `messages.routes.ts` – list, get, send, mark read, recipients

## How to Add a Route

1. Create or reuse a controller function in `controllers/`.
2. In the appropriate `routes/*.ts` file, add the route with the right middleware chain: e.g. `router.get('/path', authenticate, requireStaffOrAbove, controllerFn)`.
3. If validation is needed, add `express-validator` and `validate` middleware.
4. Mount the router in `index.ts` if it’s a new file (e.g. `app.use('/api/xyz', xyzRoutes)`).

## How to Add a Controller or Middleware

- **Controller:** Add a function in the relevant file under `controllers/`. Use `req.user` for auth and `req.user.companyId` when you need to restrict by company. Return JSON with `res.json()` or `res.status().json()`.
- **Middleware:** Add in `middleware/` and use `(req, res, next) => { ...; next(); }`. For role checks, use or extend the helpers in `auth.ts`.

## Seed User (Super Admin)

After `npm run db:seed`, you can log in as super admin. Credentials are set in the seed script (e.g. `server/src/db/seed.ts`). Default is often `superadmin@azmarineberg.com` with a password defined in the seed – check the seed file or project README for the current password.
