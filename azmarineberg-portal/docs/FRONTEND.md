# Frontend Documentation

## Tech Stack

- **React 18** with TypeScript
- **Vite** – build tool and dev server
- **React Router** – routing and protected routes
- **TanStack Query (React Query)** – server state and caching
- **Tailwind CSS** – styling
- **Recharts** – charts (e.g. dashboard)

## Project Structure

```
client/
├── src/
│   ├── components/       # Reusable UI (layout, modals, dialogs)
│   │   ├── layout/       # SidebarLayout, AdminLayout
│   │   ├── AddFacilityModal.tsx
│   │   ├── AddServiceModal.tsx
│   │   ├── CreateClientModal.tsx
│   │   ├── DeleteConfirmDialog.tsx
│   │   ├── DocumentPreviewModal.tsx
│   │   └── SignOutConfirmDialog.tsx
│   ├── contexts/         # AuthContext (user, login, logout, token refresh)
│   ├── data/             # Static data (e.g. nigerianLocations.ts)
│   ├── pages/            # Route-level pages
│   ├── services/         # API client (api.ts)
│   ├── App.tsx           # Router and protected route logic
│   ├── main.tsx
│   └── index.css
├── vercel.json           # SPA rewrites for Vercel
└── package.json
```

## Environment Variables

The client uses a single optional env var:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Base URL of the backend API (no `/api` suffix) | (none – requests go to same origin `/api`) |

- In development with no `VITE_API_URL`, the app assumes the API is proxied or served from the same origin at `/api`.
- In production (e.g. Vercel), set `VITE_API_URL` to the full backend URL (e.g. `https://your-api.onrender.com`).

Defined in `client/src/services/api.ts`:

```ts
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';
```

## How to Run

- **Install:** `cd client && npm install`
- **Dev:** `npm run dev` (from repo root: `npm run dev` runs both client and server)
- **Build:** `npm run build` (output in `client/dist`)
- **Preview build:** `npm run preview` (if available)

## Routing and Role-Based Access

Defined in `client/src/App.tsx`.

### Public Routes

- `/login` – Client login
- `/admin/login` – Staff/Admin/Super Admin login
- `/invite` – Accept invite (set password, join company)

### Protected Routes (require auth)

All protected routes sit under a layout that uses `SidebarLayout` and `ProtectedRoute`. Role restrictions:

| Path | Allowed roles |
|------|----------------|
| `/dashboard` | client |
| `/profile` | client |
| `/services` | client |
| `/services/:id` | client, admin, staff, super_admin |
| `/messages` | client, admin, staff, super_admin |
| `/admin` (layout) | admin, staff, super_admin |
| `/admin` (index) | super_admin (SuperAdminDashboard) |
| `/admin/clients` | staff, super_admin |
| `/admin/clients/:id` | staff, super_admin |
| `/admin/regulators` | staff, super_admin (admin+ for create/edit) |
| `/admin/service-types` | staff, super_admin (admin+ for create/edit) |
| `/admin/report` | staff, super_admin |
| `/admin/industry-sectors` | super_admin |
| `/admin/users` | super_admin |
| `/admin/audit-log` | super_admin |

- If the user is not logged in, they are redirected to `/login` or `/admin/login` depending on whether the path starts with `/admin`.
- If the user’s role is not allowed for a route, they are redirected to `/admin` or `/` as configured per route.

## Auth Flow

- **AuthContext** (`contexts/AuthContext.tsx`): Provides `user`, `loading`, `login`, `logout`, and persistence of tokens. On load, it calls `/api/auth/me` (with access token) to restore the session.
- **Tokens:** Access token and refresh token are stored in `localStorage`. The API client sends `Authorization: Bearer <accessToken>` on each request.
- **Refresh:** On 401, `api.ts` calls `POST /api/auth/refresh` with the refresh token; on success it stores new tokens and retries the request. On refresh failure it clears tokens and redirects to the appropriate login page.
- **Logout:** Client calls `POST /api/auth/logout` (optional) and clears local tokens; user is redirected to login.

## API Usage Pattern

- **Base module:** `client/src/services/api.ts`
- **Convenience:** `api.get(path)`, `api.post(path, body)`, `api.put(path, body)`, `api.patch(path, body)`, `api.delete(path)` for JSON. Plus `api.uploadFile(path, file, documentType)` and `api.downloadBlob(path)` for files.
- **Auth:** All requests (except login/refresh) attach the access token. On 401, refresh is attempted once; then redirect to login if still 401.
- **Errors:** Non-2xx responses throw with `err.message` from server `error` field or a generic message.

Pages and components use these methods (and sometimes TanStack Query wrappers) to talk to the backend. There are no other API base URLs; everything goes through this module.

## Key Pages and Their API Calls

| Page | Main API usage |
|------|----------------|
| LoginPage | `api.login(email, password)` |
| StaffLoginPage | `api.login(email, password)` |
| InvitePage | `GET /api/auth/accept-invite?token=`, `POST /api/auth/accept-invite` |
| ClientDashboard | `GET /api/clients/dashboard/stats`, `GET /api/clients/company`, `GET /api/clients/services` |
| ClientProfilePage | `GET /api/auth/me`, `PATCH` profile (if implemented) |
| ClientServicesPage | `GET /api/clients/services` |
| ServiceDetailPage | `GET /api/services/:id`, documents and report cycles via same or related endpoints |
| MessagePage | `api.messages.list`, `api.messages.get`, `api.messages.send`, `api.messages.listStaffRecipients` / `listClientRecipients` |
| AdminClients | `GET /api/admin/clients` |
| AdminClientDetail | `GET /api/admin/clients/:id`, facilities, services, invite |
| RegulatorsPage | `GET /api/admin/regulators`, POST/PUT/DELETE regulators |
| ServiceTypesPage | `GET /api/admin/service-types`, POST/PUT/DELETE service types |
| IndustrySectorsPage | `GET /api/admin/industry-sectors`, CRUD (super_admin) |
| UsersPage | `GET /api/admin/users`, POST/PUT users (super_admin) |
| AuditLogPage | `GET /api/dashboard/audit-logs` |
| ReportPage | `GET /api/admin/report`, export |
| SuperAdminDashboard | `GET /api/dashboard/metrics` |

## How to Add a New Page and Route

1. Create a new component under `client/src/pages/`, e.g. `MyPage.tsx`.
2. In `App.tsx`, import the component and add a `<Route>` inside the appropriate layout. Use `<ProtectedRoute allowedRoles={['role1','role2']}>` if the page is role-restricted.
3. Add navigation to the new page in `SidebarLayout.tsx` or `AdminLayout.tsx` (sidebar links).
4. Use `api.get()`, `api.post()`, etc. (or TanStack Query) in the page to call the backend.

## How to Add a New API Call

1. If it’s a one-off, use `api.get(path)`, `api.post(path, body)`, etc. from `services/api.ts`.
2. If it’s reusable or used in several places, add a named method to the `api` object in `api.ts`, or a dedicated subsection (e.g. `api.messages.*`). Use the same `request<T>()` helper so auth and refresh logic apply.
