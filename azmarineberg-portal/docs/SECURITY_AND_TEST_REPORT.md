# Security and robustness test report

This document provides a template and guidance for recording the results of penetration testing, load testing, and audit log verification, plus recommendations applied and remaining.

---

## 1. Hardening implemented

| Item | Status | Details |
|------|--------|---------|
| Rate limiting (auth) | Done | `/api/auth`: 50 requests per 15 minutes per IP (express-rate-limit). |
| Rate limiting (API) | Done | `/api`: 500 requests per 15 minutes per IP. |
| Security headers | Done | Helmet middleware (CSP disabled for SPA compatibility). |
| Global error handler | Done | 4-arg handler in index.ts; production does not expose stack traces or internal messages. |
| Audit log coverage | Done | Added audit for `add_service` (admin) and `upload_document` (documents). See [AUDIT_LOG_COVERAGE.md](./AUDIT_LOG_COVERAGE.md). |

---

## 2. Penetration test

### Scope

- In scope: All `/api/*` endpoints, auth flows (login, refresh, invite, set-password), document upload and serve, frontend (XSS, navigation).
- Out of scope: Third-party services (Neon, R2, Vercel, Render).

### Tools

- OWASP ZAP (automated + manual).
- Burp Suite (optional, manual).
- `npm audit` (client and server).

### Results (fill after test)

| Check | Result | Notes |
|-------|--------|--------|
| Authentication (token handling, expiry) | _Pass / Fail_ | |
| Authorization (role checks on sensitive endpoints) | _Pass / Fail_ | |
| Input validation / injection | _Pass / Fail_ | |
| File upload (type, size, path traversal) | _Pass / Fail_ | |
| Sensitive data in responses/logs | _Pass / Fail_ | |
| CORS and security headers | _Pass / Fail_ | |
| npm audit (critical/high) | _Pass / Fail_ | |

### Findings and response

| ID | Finding | Severity | Response / Remediation |
|----|---------|----------|------------------------|
| _e.g. P-01_ | _Description_ | _High/Med/Low_ | _Fixed / Accepted / Deferred_ |

### Recommendations (post–pen test)

- Address any High/Critical findings before production or document accepted risk.
- Re-run ZAP after fixes and record final status.

---

## 3. Load test

### Tool and script

- **Tool:** k6.
- **Script:** [load-test/k6-audit-api.js](../load-test/k6-audit-api.js) (health, login, auth/me, audit-logs).

### Environment

- Target: _e.g. https://azmarineberg-portal.onrender.com_
- Date: _YYYY-MM-DD_

### Results (fill after run)

| Metric | Target | Actual |
|--------|--------|--------|
| http_req_failed rate | < 5% | _%_ |
| http_req_duration p95 | < 5s | _ms_ |
| Requests per second (sustained) | _optional_ | _rps_ |

### Response

- _Pass / Fail against thresholds._
- Any errors (4xx/5xx) observed: _list and frequency._
- Tuning applied (e.g. pool size, timeouts): _if any._

### Recommendations

- If p95 is high: check DB and R2 latency; consider connection pool size and timeouts.
- If errors under load: add or adjust rate limits and timeouts; re-test.

---

## 4. Audit log verification

### Coverage review

- **Document:** [AUDIT_LOG_COVERAGE.md](./AUDIT_LOG_COVERAGE.md).
- **Verified:** All create/update/delete paths in admin, users, industry sectors, services, and documents controllers call `auditService.log()` with appropriate action and entity.
- **Added:** Audit for `add_service` (admin), `upload_document` (documents).

### Access control

- List audit logs: `GET /api/dashboard/audit-logs` — protected by dashboard auth; only roles with dashboard access can list. No delete or edit API for audit logs.

### Recommendations

- Define retention period (e.g. 1 year) and document in operations.
- Optional: automated smoke test that performs one audited action and asserts a matching audit log entry via the API.

---

## 5. Overall recommendations

1. **Secrets:** Rotate JWT and DB credentials periodically; use env vars only.
2. **Dependencies:** Run `npm audit` in client and server regularly; fix or document exceptions for critical/high.
3. **Validation:** Ensure express-validator (or equivalent) is used on all routes that accept user input.
4. **Monitoring:** In production, monitor rate-limit hits, 5xx rates, and audit log volume.
5. **Re-test:** Re-run penetration and load tests after major changes or at least annually.

---

*Report version: 1.0. Fill in the “Results” and “Findings” sections after executing the tests.*
