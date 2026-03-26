# User Guide – Client

This guide is for **client users**: people who log in to the portal to view their company’s services, upload documents, and communicate with the consultancy.

---

## 1. Access and login

### 1.1 Logging in with an existing account

**Step 1:** Open the client portal URL (e.g. `https://your-portal.vercel.app` or the link provided by your consultancy).

**Step 2:** You should see the client login page with “Azmarineberg” and “Client Portal”.

![Client login](screenshots/client-login.png)

**Step 3:** Enter your **email** and **password**, then click **Sign in**.

**Step 4:** If the details are correct, you are taken to your **Dashboard**. If you see “This login is for clients only”, use the staff portal link instead (usually `/admin/login`).

**Expected result:** You are on the Dashboard and see the sidebar with Dashboard, Profile, Services, and Messages.

---

### 1.2 First-time access: accepting an invite

Your consultancy may send you an **invite link** by email. Use it to set your password and join the portal.

**Step 1:** Click the invite link in the email. It will look like:  
`https://your-portal.../invite?token=...`

**Step 2:** The invite page may show your email (pre-filled). If the link is invalid or expired, you will see an error.

![Invite page](screenshots/client-invite.png)

**Step 3:** Enter a **password** (at least 8 characters) and **confirm password**, then submit.

**Step 4:** You are logged in and redirected to the **Dashboard**.

**Expected result:** You can use the portal with your new password; next time you can log in from the normal client login page with the same email and password.

---

## 2. Dashboard

**Step 1:** After login, the main view is the **Dashboard**.

**Step 2:** You will see up to four summary cards:

- **Active Services** – number of active services
- **Completed** – number of completed services
- **Expiring Soon** – services nearing expiry
- **Pending Reports** – report cycles that are pending

![Client dashboard](screenshots/client-dashboard.png)

**Expected result:** You have a quick overview of your company’s compliance status. Use the sidebar to go to **Services** for details or **Messages** to contact the consultancy.

---

## 3. Profile

**Step 1:** In the sidebar, click **Profile**.

**Step 2:** You can view (and, if the portal supports it, edit) your profile details such as name and contact information.

![Client profile](screenshots/client-profile.png)

**Expected result:** Your profile page is displayed. Save any changes if an Edit option is available.

---

## 4. Services

**Step 1:** In the sidebar, click **Services**.

**Step 2:** You see a list of all services linked to your company (e.g. permits, registrations). The list may show service type, status, validity dates, and facility.

![Services list](screenshots/client-services-list.png)

**Step 3:** Click a **service row** (or a “View” link) to open the **Service detail** page.

**Step 4:** On the service detail page you can see:

- Service description, status, validity dates
- List of **documents** (uploaded files)
- **Report cycles** (e.g. monthly/quarterly/annual) and their due dates and status

![Service detail](screenshots/client-service-detail.png)

**Expected result:** You can see which services your company has and their current status and documents.

---

## 5. Documents

Documents are attached to a **service**. You view and upload them from the service detail page.

### 5.1 Viewing and downloading documents

**Step 1:** Open **Services** and then the relevant **service**.

**Step 2:** In the **Documents** section, you see a table or list of files (name, type, uploaded by, date).

**Step 3:** Use the **Download** or **View** action for a document to open or save the file. The portal may open a new tab or trigger a download.

**Expected result:** You can open or download each document associated with that service.

### 5.2 Uploading a document

**Step 1:** On the **service detail** page, find the **Upload** or “Add document” area.

**Step 2:** Click **Choose file** (or similar) and select a file from your device. Check the maximum file size (e.g. 20 MB) and allowed types if shown.

**Step 3:** Optionally select **document type** if the form asks for it (e.g. client upload).

**Step 4:** Click **Upload** (or “Submit”).

![Document upload](screenshots/client-document-upload.png)

**Expected result:** The new document appears in the documents list for that service. Staff can see it and use it for compliance or reporting.

---

## 6. Messages

**Step 1:** In the sidebar, click **Messages**.

**Step 2:** You see your **inbox**: messages from the consultancy (subject, preview, date). You may be able to switch to “Sent” if you can send messages.

**Step 3:** Click a **message** to open it and read the full content. It may be marked as read automatically.

![Messages list](screenshots/client-messages-list.png)

**Step 4:** If **Reply** is available, you can type a reply and send it. Replies may appear as a thread under the same subject.

![Message thread](screenshots/client-message-thread.png)

**Expected result:** You can read messages from the consultancy and, where supported, reply in the portal.

---

## 7. Logout and session

**Step 1:** To sign out, use the **Sign out** or **Logout** option (often in the top-right or sidebar).

**Step 2:** If the portal asks for confirmation, confirm **Sign out**.

**Expected result:** You are logged out and returned to the client login page. Your session may also end after a period of inactivity; in that case you will need to log in again.

---

## Summary

As a **client** you can:

- Log in (or set your password via an invite link).
- View the dashboard summary (active services, expiring soon, pending reports).
- Open **Profile** and, if available, edit your details.
- Open **Services**, see the list, and open a service to see its details, documents, and report cycles.
- View and **download** documents; **upload** new documents to a service where allowed.
- Read and, where supported, **reply** to **Messages** from the consultancy.
- **Sign out** when finished.

For staff-side features (managing clients, regulators, reports, etc.), see [USER_GUIDE_STAFF.md](USER_GUIDE_STAFF.md).
