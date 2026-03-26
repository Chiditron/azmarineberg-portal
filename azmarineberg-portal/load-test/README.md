# Load testing (k6)

Requires [k6](https://k6.io/docs/getting-started/installation/) installed.

- **Quick run (local API):**  
  `k6 run load-test/k6-audit-api.js`

- **Against staging/production:**  
  `k6 run -e BASE_URL=https://your-backend.onrender.com load-test/k6-audit-api.js`

- **With custom login (if needed):**  
  `k6 run -e BASE_URL=https://... -e LOGIN_EMAIL=... -e LOGIN_PASSWORD=... load-test/k6-audit-api.js`

Thresholds in the script: `http_req_failed` < 5%, `p95` < 5s. Adjust in `options.thresholds` as needed.
