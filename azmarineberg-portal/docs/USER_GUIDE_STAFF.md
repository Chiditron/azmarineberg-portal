# User Guide – Staff

This guide is for **staff**, **admin**, and **super admin** users who manage clients, services, regulators, reports, and (for super admin) industry sectors, users, and audit logs.

---

## 1. Access and login

**Step 1:** Open the **staff portal** URL. It is usually the same domain as the client portal but with `/admin/login` (e.g. `https://your-portal.vercel.app/admin/login`).

**Step 2:** You should see the staff login page (often labeled “Staff” or “Admin” login).

![Staff login](screenshots/staff-login.png)

**Step 3:** Enter your **email** and **password**, then click **Sign in**.

**Step 4:** If your role is staff, admin, or super_admin, you are taken to the **admin area**. The first screen may be the Super Admin Dashboard (super_admin only), or the default admin view (e.g. Clients).

**Expected result:** You are logged in and see the admin layout with a sidebar (Clients, Regulators, Service Types, Report, Industry Sectors, Users, Audit Log, Messages, etc., depending on your role).

![Admin home](screenshots/staff-admin-home.png)

---

## 2. Admin home and navigation

**Step 1:** After login, the **sidebar** shows menu items according to your role:

- **Staff / Admin:** Clients, Regulators, Service Types, Report, Messages.
- **Admin only (create/invite):** Create client, invite client (from client detail).
- **Super Admin only:** Industry Sectors, Users, Audit Log; Super Admin Dashboard (first page).

**Step 2:** Click any menu item to open that section. The main content area updates; the URL may change (e.g. `/admin/clients`, `/admin/regulators`).

**Expected result:** You can move between Clients, Regulators, Service Types, Report, Messages, and (if super admin) Industry Sectors, Users, Audit Log, and Dashboard.

---

## 3. Clients

### 3.1 Viewing the clients list

**Step 1:** Click **Clients** in the sidebar.

**Step 2:** You see a **table** of all client companies (company name, contact, sector, etc.).

![Clients list](screenshots/staff-clients-list.png)

**Expected result:** You can see every company (client) managed in the portal.

### 3.2 Opening a client and viewing details

**Step 1:** From the clients list, click a **company row** (or “View” / client name).

**Step 2:** The **client detail** page opens. You see company information, **facilities**, and **services** for that company.

![Client detail](screenshots/staff-client-detail.png)

**Expected result:** You can see and manage facilities and services for that client.

### 3.3 Adding a facility (Staff+)

**Step 1:** On the **client detail** page, click **Add facility** (or similar).

**Step 2:** Fill in **Facility name**, **Facility address**, and any required location fields (e.g. LGA, state, zone).

**Step 3:** Submit the form.

![Add facility](screenshots/staff-add-facility.png)

**Expected result:** The new facility appears in the client’s facilities list. You can then add services to this facility.

### 3.4 Adding a service (Staff+)

**Step 1:** On the **client detail** page (or from a facility), click **Add service** (or “Add Service”).

**Step 2:** Select **Facility**, **Service type**, **Regulator**, and **Validity end** (and any other required fields). Optionally enter description or code.

**Step 3:** Submit the form.

![Add service](screenshots/staff-add-service.png)

**Expected result:** The new service appears for that client. It can then receive documents and report cycles.

### 3.5 Creating a new client (Admin only)

**Step 1:** From the clients list or a “Create client” entry point, open the **Create client** form/modal.

**Step 2:** Enter **company name**, **email**, **contact person**, **address**, **phone**, **LGA**, **state**, **zone**, **industry sector**, and at least one **facility** (name and address).

**Step 3:** Submit. The new company and facility are created.

**Expected result:** The new client appears in the clients list. You can then invite a user to that company (see below).

### 3.6 Inviting a client user (Admin only)

**Step 1:** Open the **client detail** page for the company.

**Step 2:** Find **Invite** or “Invite user” and enter the **email** of the person to invite.

**Step 3:** Submit. The system sends an invite email with a link.

**Expected result:** The recipient receives an email with a link to `/invite?token=...`. When they set their password, they become a client user for that company.

---

## 4. Regulators

**Step 1:** Click **Regulators** in the sidebar.

**Step 2:** You see a list of **regulators** (name, code, level e.g. federal/state).

**Step 3:** **Admin (and above)** can **Create** a new regulator or **Edit** / **Delete** existing ones. Staff can only view.

![Regulators](screenshots/staff-regulators.png)

**Expected result:** Regulators are used when defining services; you can manage the list if you have admin rights.

---

## 5. Service types

**Step 1:** Click **Service types** in the sidebar.

**Step 2:** You see a list of **service types** (name, code, linked regulator).

**Step 3:** **Admin (and above)** can **Create**, **Edit**, or **Delete** service types. Staff can only view.

![Service types](screenshots/staff-service-types.png)

**Expected result:** Service types define what kind of permit or service you can add to a client (e.g. Environmental Permit, Waste Licence).

---

## 6. Reports

**Step 1:** Click **Report** in the sidebar.

**Step 2:** You see **report cycles** (and possibly submissions) – e.g. monthly, quarterly, annual – with due dates and status (pending, submitted, acknowledged).

**Step 3:** You may be able to **filter** by client or date and **export** a report (e.g. CSV or PDF) for compliance or internal use.

![Report page](screenshots/staff-report.png)

**Expected result:** You can track reporting obligations and export report data where the feature is available.

---

## 7. Industry sectors (Super Admin only)

**Step 1:** If you are **Super Admin**, click **Industry Sectors** in the sidebar.

**Step 2:** You see the list of **industry sectors** (e.g. Manufacturing, Oil & Gas) used when creating or editing companies.

**Step 3:** You can **Create**, **Edit**, or **Delete** sectors.

![Industry sectors](screenshots/staff-industry-sectors.png)

**Expected result:** The sector list is used in client company profiles; only super admin can change it.

---

## 8. Users (Super Admin only)

**Step 1:** If you are **Super Admin**, click **Users** in the sidebar.

**Step 2:** You see **users** (email, role, company if applicable). You can **Create** a new user (staff, admin, or client linked to a company) or **Edit** existing users (e.g. role, password reset).

![Users](screenshots/staff-users.png)

**Expected result:** You manage who can access the portal and with which role.

---

## 9. Audit log (Super Admin only)

**Step 1:** If you are **Super Admin**, click **Audit Log** in the sidebar.

**Step 2:** You see a **list of actions** (actor, action, entity type, entity id, changes, IP, date). You may be able to filter by date, actor, or entity type.

**Step 3:** Use this for compliance and security review.

![Audit log](screenshots/staff-audit-log.png)

**Expected result:** You can review who did what and when in the system.

---

## 10. Messages

**Step 1:** Click **Messages** in the sidebar.

**Step 2:** You see your **inbox** (and possibly “Sent”). Click a message to read it; it may be marked as read.

**Step 3:** To **send a message**, use **Compose** or “New message”. Choose **recipient type** (staff or client). If client, you may select a single client user or **broadcast to all clients**. Enter **subject** and **body**, then send.

![Compose message](screenshots/staff-messages-compose.png)

**Expected result:** You can read messages and send messages to staff or to one or all client users.

---

## 11. Service detail (as staff)

**Step 1:** From a **client detail** page, click a **service** (or open a service from the clients list via a “View service” link). Alternatively, some flows may allow opening a service by ID (e.g. from a notification).

**Step 2:** The **service detail** page opens. You see the same structure as the client: description, status, validity, **documents** list, and **report cycles**. As staff you can also **update service status** (e.g. draft → site_visit → report_preparation → submission → approved → closed) and manage documents.

![Service detail as staff](screenshots/staff-service-detail.png)

**Expected result:** You can manage the service lifecycle and documents on behalf of the client.

---

## 12. Logout

**Step 1:** Use the **Sign out** or **Logout** option (usually in the sidebar or top-right).

**Step 2:** Confirm if prompted.

**Expected result:** You are logged out and returned to the staff login page (`/admin/login`).

---

## Summary by role

| Capability | Staff | Admin | Super Admin |
|------------|-------|-------|-------------|
| View clients, facilities, services | Yes | Yes | Yes |
| Add facility / service | Yes | Yes | Yes |
| Create client, invite client user | No | Yes | Yes |
| Regulators, Service types (CRUD) | View | Full | Full |
| Report (view, export) | Yes | Yes | Yes |
| Industry sectors (CRUD) | No | No | Yes |
| Users (CRUD) | No | No | Yes |
| Audit log | No | No | Yes |
| Messages (read, send) | Yes | Yes | Yes |

For client-side usage (dashboard, services, documents, messages), see [USER_GUIDE_CLIENT.md](USER_GUIDE_CLIENT.md).
