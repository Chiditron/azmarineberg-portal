# Web Hosting Documentation

## Where Each Component Lives

| Component | Typical production host | Notes |
|-----------|--------------------------|--------|
| **Frontend (SPA)** | Vercel | Static build; SPA rewrites so all routes serve `index.html`. |
| **Backend API** | Render | Node.js service; runs `node dist/index.js` after build. |
| **Database** | Neon (or other PostgreSQL) | Connection string in `DATABASE_URL`. |
| **Redis** | Upstash or similar | Optional; `REDIS_URL` if used for refresh tokens/session. |
| **File storage** | Cloudflare R2 or AWS S3 (or MinIO for dev) | S3-compatible; configured via `S3_*` and `STORAGE_TYPE`. |

The frontend and API are separate deployments; the browser loads the SPA from Vercel and then calls the API on Render. CORS is configured on the server with `APP_URL` (or origin allowlist) so that the Vercel origin is allowed.

## Environment Variables by Environment

### Vercel (client)

- **VITE_API_URL** – Full base URL of the backend API (no trailing slash, no `/api`). Example: `https://your-app.onrender.com`. Required in production so the SPA can call the correct API.

No other client env vars are required for the app to run.

### Render (server)

Set all variables from `server/.env.example` that the server needs, plus:

- **NODE_ENV** – `production`
- **PORT** – Set by Render; do not override unless needed.
- **DATABASE_URL** – Production PostgreSQL URL (e.g. Neon).
- **REDIS_URL** – If using Redis.
- **JWT_ACCESS_SECRET**, **JWT_REFRESH_SECRET** – Strong, unique secrets.
- **JWT_ACCESS_EXPIRY**, **JWT_REFRESH_EXPIRY** – e.g. `15m`, `7d`.
- **STORAGE_TYPE** – Omit or set to non-`local` for S3/R2.
- **S3_ENDPOINT**, **S3_ACCESS_KEY**, **S3_SECRET_KEY**, **S3_BUCKET**, **S3_REGION**, **S3_USE_SSL** – For R2/S3.
- **SMTP_***, **SMTP_FROM** – For invite and notification emails.
- **APP_URL** – Frontend origin (e.g. `https://your-app.vercel.app`) for invite links and CORS.
- **RENDER_EXTERNAL_URL** – Set automatically by Render to the service’s public URL. Used by the backend to build document serve URLs. If not on Render, set **API_URL** to the public API base URL instead.

## Build and Deploy Steps

### Client (Vercel)

1. Connect the repo to Vercel (e.g. `client` as root or repo root with build command from `client`).
2. Set **VITE_API_URL** to the production API URL.
3. Build command: `npm run build` (run from `client` if root is `client`, or `cd client && npm run build` if root is repo).
4. Output directory: `dist` (Vite default).
5. Vercel will serve the SPA; `client/vercel.json` rewrites all routes to `/index.html` so client-side routing works.

### Server (Render)

1. Create a Web Service; connect the repo.
2. Root: repository root (or folder containing `server`).
3. Build command: e.g. `cd server && npm install && npm run build`.
4. Start command: e.g. `cd server && node dist/index.js`.
5. Set all env vars listed above in the Render dashboard. Do not commit secrets; use Render’s environment UI.

### Database

- Create a PostgreSQL database (e.g. Neon). Run migrations from a one-off job or locally against the production DB (with care): `DATABASE_URL=<prod_url> npm run db:migrate` from the server directory or with the migrate script pointed at the server. Optionally run seed once for super admin (or create admin manually).

### Storage

- For production, create an S3 bucket (or R2 bucket), create access keys, and set the `S3_*` and `STORAGE_TYPE` variables. Ensure the backend can reach the endpoint (network/allowlist if applicable).

## SPA Routing (Vercel)

`client/vercel.json` contains:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

So every path is served by `index.html` and the React router handles the route. This is required for direct links and refresh to work (e.g. `/admin/clients`).

## No Dockerfile in Repo

The repository does not include a Dockerfile for the app. Local development uses `npm run dev` with Docker only for Postgres (and optionally Redis and MinIO) via `docker-compose.yml`. Production deployment is described above (Vercel + Render + managed DB and storage). To run the app in Docker in the future, you would add a Dockerfile and optionally a compose file for production; the same env vars and build/start commands would apply inside the container.
