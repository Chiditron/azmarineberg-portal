# SaaS and Deployment for Profit

This document summarises how to deploy the Azmarineberg Portal for commercial use: one-off sale vs subscription (SaaS), current SaaS readiness, changes needed to run as SaaS, and pitch guidance for prospects (e.g. environmental companies).

---

## 1. One-off sale vs subscription (SaaS)

| Aspect | One-off sale | Subscription (SaaS) |
|--------|----------------------|----------------------|
| **Revenue** | Single payment per deployment or per client company | Recurring revenue (monthly/yearly) per tenant or per seat |
| **Delivery** | You host once or hand over code/instance; support is optional or sold separately | You host; ongoing access and support; you push upgrades |
| **Fit for this portal** | Sell to one consultancy; they use it for their clients | Multiple consultancies (tenants) each with their own clients; you run one shared product |
| **Billing** | No billing in the app; contract and invoicing done offline | In-app billing (e.g. Stripe), plans, and optionally usage/overages |

**Recommendation:** With multiple interested companies (e.g. 10 environmental firms), a **subscription (SaaS)** model usually gives better long-term revenue and aligns with “portal as a service.” A **one-off sale** is simpler to implement first (no billing code) but does not create recurring revenue. You can also offer both: one-off for large or custom deployments, subscription for standardised access.

---

## 2. Is the system configured for SaaS?

### Already in place (SaaS-friendly)

- **Multi-tenancy by company:** Data is isolated by `company_id`. Users, facilities, services, documents, and report cycles are scoped by company. One database can hold many “client companies” (the consultancy’s clients). Roles (client, staff, admin, super_admin) are well defined.
- **Single deployment can serve many companies:** The same codebase serves multiple companies today; the “tenant” in the current model is effectively the consultancy, and each of its client companies is a company in the DB.

### Not in place (needed for multi-consultancy SaaS)

- **Tenant/organisation model:** There is no “organisation” or “tenant” entity above companies. For SaaS where *each consultancy* is a paying customer, you need one tenant per consultancy, with many companies (their clients) per tenant. Today the app assumes one consultancy (one “owner”) and many companies under it.
- **Billing:** No payment integration (Stripe, etc.), no subscription or invoice records, no trial or expiry based on payment.
- **Provisioning:** Companies are created by admins; there is no self-signup or “create tenant” flow. For SaaS you typically want tenant signup (or admin-created tenant) and then subscription.
- **Limits:** No enforced limits (e.g. number of companies, users, or storage per plan).

**Conclusion:** The system is **multi-tenant and can be extended to SaaS**, but it is **not yet configured for SaaS** (no billing, no plans, no tenant-level model). It is well suited for a **single consultancy** (one-off sale or single-tenant hosted) or for you to add a tenant + billing layer and sell to many consultancies.

---

## 3. Changes needed to market and run as SaaS

### 3.1 Tenant (organisation) model

- Introduce an **organisation** or **tenant** entity (e.g. one row per consultancy). Add a table such as `tenants` (id, name, slug, created_at, etc.).
- Link **companies** to **tenant_id** (each company belongs to one tenant). Keep `company_id` on users, facilities, services, documents, etc. All existing `company_id` scoping stays; add tenant-level scoping for super_admin and for billing (e.g. “only show companies for this tenant”).
- Migrations: create `tenants`, add `tenant_id` to `companies`, backfill existing companies to a default tenant (e.g. “Azmarineberg”). Ensure every query that lists or filters companies respects tenant when the app is used in multi-tenant mode.

### 3.2 Plans and subscriptions

- Define **plans** (e.g. Starter, Professional, Enterprise) with limits: e.g. max companies, max users, max storage.
- Add tables such as **plans** (id, name, limits JSON, stripe_price_id, etc.) and **subscriptions** (tenant_id, plan_id, status, current_period_end, stripe_subscription_id, etc.).
- Integrate **Stripe** (or similar): create checkout session for subscription, handle webhooks (subscription created/updated/canceled/past_due), and sync status to your DB. Optionally store customer_id on tenant for invoicing.

### 3.3 Billing and access control

- **Middleware or guards:** Before creating companies, users, or uploading documents, check the tenant’s plan and current usage (e.g. company count, user count, storage). Block or warn when over limit; optionally allow overage with a flag or higher plan.
- **Usage tracking:** Optionally add a table or job that tracks usage per tenant (e.g. document count, total storage size) for display in a “Usage” or “Billing” page and for enforcing limits.

### 3.4 Provisioning and signup

- **Option A (simplest for first 10 customers):** Keep admin-created tenants. You (or a super admin) create a tenant and assign a plan (e.g. trial or paid). Create the first admin user for that tenant and send an invite. They log in and manage their companies. No public signup.
- **Option B (self-serve SaaS):** Public signup page (“Start trial”) where a new tenant is created, a default plan (e.g. 14-day trial) is assigned, and the first user is created. After trial, require payment (redirect to Stripe checkout) before allowing further use.

For 10 interested environmental companies, Option A is usually enough: you onboard each as a tenant manually and then add billing.

### 3.5 Documentation and operations

- Update [WEB_HOSTING.md](WEB_HOSTING.md) (or deployment runbook): how to run one production instance, env vars for Stripe (e.g. STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_*), webhook URL. Document **tenant onboarding**: create tenant, assign plan, create first admin, send invite.
- Ensure backup, monitoring, and incident response are documented.

### 3.6 Legal and commercial

- **Terms of service** and **privacy policy** for the portal as a service.
- **SLA** (optional): uptime, support response times.
- **Pricing page** (public or post-login) that reflects plans and, if applicable, per-company or per-user pricing.

---

## 4. Pitch and positioning for environmental companies

### 4.1 Pitch angle

- **Headline:** Centralised environmental compliance portal: manage permits, documents, and reporting in one place; give your clients a secure portal; keep an audit trail and stay on top of report cycles.
- **Problem:** Scattered documents, missed report deadlines, clients emailing files, no single view of who has what permit and when it expires.
- **Solution:** One portal where you manage all clients and services; clients see only their data and can upload documents and read messages; report cycles and expiries are visible and (where configured) reminded.

### 4.2 Demo flow

1. **Staff login** → Show admin home and **Clients** list.
2. **Open a client** → Show facilities and services; **add a facility** and **add a service** (type, regulator, validity).
3. **Open a service** → Show **documents** (list, upload), **report cycles** (due dates, status).
4. **Reports** → Show report list/export.
5. **Switch to client view** → Log in as a client; show **Dashboard** (stats), **Services**, **upload a document**, **Messages**.
6. **Super admin (if relevant)** → Brief look at **Audit log** and **Users** to show control and traceability.

Keep the demo to 15–20 minutes and focus on “one place for everything” and “your clients can self-serve.”

### 4.3 Benefits to stress

- **Less email and scattered files** – Everything in one system, linked to the right service and company.
- **One source of truth** – Status, due dates, and documents are always current.
- **Client self-service** – Clients log in to view and upload; fewer “can you send me…” emails.
- **Regulator and service-type flexibility** – You define regulators and service types; the portal adapts to your workflow.
- **Audit trail for compliance** – Who did what, when; supports audits and regulator requests.

### 4.4 Commercial options to present

1. **Subscription (SaaS):** “Portal as a service” per consultancy – monthly or yearly fee. Emphasise no upfront build cost, automatic updates, and scalability.
2. **One-off:** Single implementation fee (and optional annual support). Position for larger or custom deployments that prefer a fixed cost.
3. **Hybrid:** Lower subscription plus one-off onboarding or setup fee.

### 4.5 Next steps with prospects

1. Share the **one-pager** and **benefits/use-case** doc from the [Marketing Pack](MARKETING_PACK.md).
2. Offer a **short live demo** (use the demo flow above).
3. Send the **user guide** ([Client](USER_GUIDE_CLIENT.md) and [Staff](USER_GUIDE_STAFF.md)) so they can try the portal with a trial account.
4. Propose a **pilot** (e.g. 1–3 months) with a clear path to paid subscription or one-off deal, including pricing and support.

---

## 5. Summary

- **One-off sale:** Sell or host the portal for one consultancy; no billing in app; contract and invoicing offline. Easiest to start with.
- **SaaS:** Add tenant + plans + Stripe (or similar); onboard each consultancy as a tenant; charge recurring. Best for scaling to many customers (e.g. 10+ environmental companies).
- **Current state:** Multi-tenant by company and role-ready; no tenant entity, no billing, no plans. Suitable for single-consultancy deployment today; extend with the steps in section 3 to market and run as SaaS.
- **Pitch:** Use the marketing pack and this doc to stress benefits, show a tight demo, and move prospects to a pilot and then paid subscription or one-off sale.
