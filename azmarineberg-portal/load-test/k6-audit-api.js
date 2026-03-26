/**
 * k6 load test: API (health, auth, and authenticated endpoints)
 * Run: k6 run load-test/k6-audit-api.js
 * Override base URL: k6 run -e BASE_URL=https://your-api.onrender.com load-test/k6-audit-api.js
 * Optionally set LOGIN_EMAIL and LOGIN_PASSWORD for auth scenario (e.g. superadmin@azmarineberg.com / SuperAdmin123!)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API = `${BASE_URL}/api`;
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL || 'superadmin@azmarineberg.com';
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD || 'SuperAdmin123!';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<5000'],
  },
};

function login() {
  const res = http.post(`${API}/auth/login`, JSON.stringify({
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status !== 200) return null;
  const body = JSON.parse(res.body);
  return body.accessToken || null;
}

export default function () {
  // Health check (no auth)
  const healthRes = http.get(`${API}/health`);
  check(healthRes, { 'health status 200': (r) => r.status === 200 });
  sleep(0.5);

  // Login (auth scenario)
  const token = login();
  if (token) {
    check(true, { 'login ok': () => true });
    const meRes = http.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(meRes, { 'auth/me 200': (r) => r.status === 200 });
    sleep(0.3);

    // Dashboard audit logs (paginated)
    const auditRes = http.get(`${API}/dashboard/audit-logs?limit=25&offset=0`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(auditRes, { 'audit-logs 200': (r) => r.status === 200 });
  }
  sleep(1);
}
