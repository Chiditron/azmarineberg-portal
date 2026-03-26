# Screenshot placeholders for user guides

Small placeholder PNGs are included so links in the user guides open without errors. **Replace them with real screenshots** for better docs: run the app (`npm run dev`), capture each screen, and save with the filenames below in this folder.

Referenced in [USER_GUIDE_CLIENT.md](../USER_GUIDE_CLIENT.md) and [USER_GUIDE_STAFF.md](../USER_GUIDE_STAFF.md).

## Client guide

| Filename | Description |
|----------|-------------|
| client-login.png | Client login page |
| client-invite.png | Invite page (set password) |
| client-dashboard.png | Client dashboard with stats cards |
| client-profile.png | Client profile page |
| client-services-list.png | Services list page |
| client-service-detail.png | Service detail (documents, status) |
| client-document-upload.png | Document upload (on service detail) |
| client-messages-list.png | Messages inbox |
| client-message-thread.png | Single message / thread |

## Staff guide

| Filename | Description |
|----------|-------------|
| staff-login.png | Staff/Admin login page |
| staff-admin-home.png | Admin layout / sidebar after login |
| staff-clients-list.png | Admin clients list |
| staff-client-detail.png | Client detail (facilities, services) |
| staff-add-facility.png | Add facility modal/form |
| staff-add-service.png | Add service modal/form |
| staff-regulators.png | Regulators page |
| staff-service-types.png | Service types page |
| staff-report.png | Report page |
| staff-industry-sectors.png | Industry sectors page (Super Admin) |
| staff-users.png | Users page (Super Admin) |
| staff-audit-log.png | Audit log page (Super Admin) |
| staff-messages-compose.png | Compose message / recipients |
| staff-service-detail.png | Service detail as staff |

**Automated:** From repo root run `npm run screenshots` (see [USER_GUIDE_README.md](../USER_GUIDE_README.md)). Requires `.env` with Playwright credentials.  
**Manual:** Capture from a running app (e.g. `npm run dev`) and save with these names so the markdown image links work.
