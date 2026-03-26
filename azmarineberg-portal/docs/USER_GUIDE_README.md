# User Guide – Overview

This folder contains step-by-step user guides for the Azmarineberg Portal, aimed at end users (clients and staff) rather than developers.

## Guides

| Guide | Audience | Description |
|-------|----------|-------------|
| [USER_GUIDE_CLIENT.md](USER_GUIDE_CLIENT.md) | **Client users** | Logging in (and accepting an invite), dashboard, profile, services, documents, messages, and signing out. |
| [USER_GUIDE_STAFF.md](USER_GUIDE_STAFF.md) | **Staff, Admin, Super Admin** | Staff login, admin home, managing clients/facilities/services, regulators, service types, reports, industry sectors, users, audit log, messages, and signing out. |

## Screenshots

The guides reference screenshots in the `screenshots/` folder. Each screenshot is named so you can replace placeholders with real captures.

### How to capture screenshots

**Option A – Automated (Playwright)**  
1. Copy `.env.example` in the repo root to `.env` and set `PLAYWRIGHT_CLIENT_EMAIL`, `PLAYWRIGHT_CLIENT_PASSWORD`, `PLAYWRIGHT_STAFF_EMAIL`, `PLAYWRIGHT_STAFF_PASSWORD` (use test accounts only; do not commit `.env`).  
2. First time only: `npx playwright install chromium`.  
3. Start the app: `npm run dev`.  
4. In another terminal, from the repo root run: `npm run screenshots`.  
5. Screenshots are written to `docs/screenshots/` with the names used in the guides.

**Option B – Manual**  
1. **Run the app:** From the project root run `npm run dev` so the client (e.g. http://localhost:5173) and server are running. Alternatively use your staging or production URL.
2. **Use a clean state:** Use a test client account and a test staff account so data looks consistent (e.g. seed data or a dedicated demo company).
3. **Browser:** Open the portal in a browser and perform the steps described in the guide. Use the browser’s built-in screenshot (e.g. DevTools) or a tool like Snipping Tool / Greenshot.
4. **Save in the right place:** Save images under `docs/screenshots/` with the exact filenames used in the guides (e.g. `client-login.png`, `client-dashboard.png`). See the list in [screenshots/README.md](screenshots/README.md).
5. **Optional:** Crop to the relevant area and keep a consistent width (e.g. 800–1200 px) so the docs stay readable.

If a screenshot is missing, the guide will still make sense from the step descriptions; the image is there to speed up recognition.
