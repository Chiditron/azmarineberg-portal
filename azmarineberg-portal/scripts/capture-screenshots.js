/**
 * Playwright script to capture user-guide screenshots.
 * Credentials come from env (use .env in repo root or export before running).
 * Do NOT commit real passwords. Use test accounts.
 *
 * Required env:
 *   PLAYWRIGHT_BASE_URL  (default: http://localhost:5173)
 *   PLAYWRIGHT_CLIENT_EMAIL
 *   PLAYWRIGHT_CLIENT_PASSWORD
 *   PLAYWRIGHT_STAFF_EMAIL
 *   PLAYWRIGHT_STAFF_PASSWORD
 *
 * Run: npm run screenshots
 * (Start the app first: npm run dev)
 * First time: npx playwright install chromium
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { chromium } = require('playwright');

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots');

async function main() {
  const clientEmail = process.env.PLAYWRIGHT_CLIENT_EMAIL;
  const clientPassword = process.env.PLAYWRIGHT_CLIENT_PASSWORD;
  const staffEmail = process.env.PLAYWRIGHT_STAFF_EMAIL;
  const staffPassword = process.env.PLAYWRIGHT_STAFF_PASSWORD;

  if (!clientEmail || !clientPassword || !staffEmail || !staffPassword) {
    console.error('Missing credentials. Set in .env (repo root) or environment:');
    console.error('  PLAYWRIGHT_CLIENT_EMAIL, PLAYWRIGHT_CLIENT_PASSWORD');
    console.error('  PLAYWRIGHT_STAFF_EMAIL, PLAYWRIGHT_STAFF_PASSWORD');
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  try {
    // ---- Client portal ----
    const clientPage = await context.newPage();

    // Client login page
    await clientPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await clientPage.screenshot({ path: path.join(OUT_DIR, 'client-login.png') });
    console.log('  client-login.png');

    // Client login and go to dashboard
    await clientPage.fill('#email', clientEmail);
    await clientPage.fill('#password', clientPassword);
    await clientPage.click('button[type="submit"]');
    await clientPage.waitForURL(/\/dashboard/, { timeout: 10000 });
    await clientPage.waitForLoadState('networkidle');

    await clientPage.screenshot({ path: path.join(OUT_DIR, 'client-dashboard.png') });
    console.log('  client-dashboard.png');

    await clientPage.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle' });
    await clientPage.screenshot({ path: path.join(OUT_DIR, 'client-profile.png') });
    console.log('  client-profile.png');

    await clientPage.goto(`${BASE_URL}/services`, { waitUntil: 'networkidle' });
    await clientPage.screenshot({ path: path.join(OUT_DIR, 'client-services-list.png') });
    console.log('  client-services-list.png');

    // Service detail: try first service link if present
    const serviceLinks = clientPage.locator('a[href^="/services/"]');
    if ((await serviceLinks.count()) > 0) {
      await serviceLinks.first().click();
      await clientPage.waitForURL(/\/services\/[^/]+/, { timeout: 5000 });
      await clientPage.waitForLoadState('networkidle');
      await clientPage.screenshot({ path: path.join(OUT_DIR, 'client-service-detail.png') });
      console.log('  client-service-detail.png');
      // Same page may have upload area
      await clientPage.screenshot({ path: path.join(OUT_DIR, 'client-document-upload.png') });
      console.log('  client-document-upload.png');
    }

    await clientPage.goto(`${BASE_URL}/messages`, { waitUntil: 'networkidle' });
    await clientPage.screenshot({ path: path.join(OUT_DIR, 'client-messages-list.png') });
    console.log('  client-messages-list.png');
    const firstMessage = clientPage.locator('a[href*="/messages"], [role="button"]').first();
    if ((await firstMessage.count()) > 0) {
      await firstMessage.click();
      await clientPage.waitForTimeout(800);
      await clientPage.screenshot({ path: path.join(OUT_DIR, 'client-message-thread.png') });
      console.log('  client-message-thread.png');
    }

    await clientPage.close();

    // Invite page (no valid token - will show error or form)
    const invitePage = await context.newPage();
    await invitePage.goto(`${BASE_URL}/invite`, { waitUntil: 'networkidle' });
    await invitePage.screenshot({ path: path.join(OUT_DIR, 'client-invite.png') });
    console.log('  client-invite.png');
    await invitePage.close();

    // ---- Staff portal ----
    const staffPage = await context.newPage();

    await staffPage.goto(`${BASE_URL}/admin/login`, { waitUntil: 'networkidle' });
    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-login.png') });
    console.log('  staff-login.png');

    await staffPage.fill('#email', staffEmail);
    await staffPage.fill('#password', staffPassword);
    await staffPage.click('button[type="submit"]');
    await staffPage.waitForURL(/\/admin/, { timeout: 10000 });
    await staffPage.waitForLoadState('networkidle');

    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-admin-home.png') });
    console.log('  staff-admin-home.png');

    await staffPage.goto(`${BASE_URL}/admin/clients`, { waitUntil: 'networkidle' });
    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-clients-list.png') });
    console.log('  staff-clients-list.png');

    const clientRowLinks = staffPage.locator('a[href^="/admin/clients/"]');
    if ((await clientRowLinks.count()) > 0) {
      await clientRowLinks.first().click();
      await staffPage.waitForURL(/\/admin\/clients\/[^/]+/, { timeout: 5000 });
      await staffPage.waitForLoadState('networkidle');
      await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-client-detail.png') });
      console.log('  staff-client-detail.png');

      const addFacilityBtn = staffPage.getByRole('button', { name: /add facility|facility/i });
      if ((await addFacilityBtn.count()) > 0) {
        await addFacilityBtn.click();
        await staffPage.waitForTimeout(500);
        await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-add-facility.png') });
        console.log('  staff-add-facility.png');
        await staffPage.keyboard.press('Escape');
      }

      const addServiceBtn = staffPage.getByRole('button', { name: /add service|service/i });
      if ((await addServiceBtn.count()) > 0) {
        await addServiceBtn.click();
        await staffPage.waitForTimeout(500);
        await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-add-service.png') });
        console.log('  staff-add-service.png');
        await staffPage.keyboard.press('Escape');
      }

      const serviceLinksStaff = staffPage.locator('a[href*="/services/"]');
      if ((await serviceLinksStaff.count()) > 0) {
        await serviceLinksStaff.first().click();
        await staffPage.waitForTimeout(800);
        await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-service-detail.png') });
        console.log('  staff-service-detail.png');
      }
    }

    await staffPage.goto(`${BASE_URL}/admin/regulators`, { waitUntil: 'networkidle' });
    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-regulators.png') });
    console.log('  staff-regulators.png');

    await staffPage.goto(`${BASE_URL}/admin/service-types`, { waitUntil: 'networkidle' });
    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-service-types.png') });
    console.log('  staff-service-types.png');

    await staffPage.goto(`${BASE_URL}/admin/report`, { waitUntil: 'networkidle' });
    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-report.png') });
    console.log('  staff-report.png');

    await staffPage.goto(`${BASE_URL}/admin/industry-sectors`, { waitUntil: 'networkidle' });
    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-industry-sectors.png') });
    console.log('  staff-industry-sectors.png');

    await staffPage.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-users.png') });
    console.log('  staff-users.png');

    await staffPage.goto(`${BASE_URL}/admin/audit-log`, { waitUntil: 'networkidle' });
    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-audit-log.png') });
    console.log('  staff-audit-log.png');

    await staffPage.goto(`${BASE_URL}/admin/messages`, { waitUntil: 'networkidle' });
    const composeBtn = staffPage.getByRole('button', { name: /compose|new message/i });
    if ((await composeBtn.count()) > 0) {
      await composeBtn.click();
      await staffPage.waitForTimeout(500);
    }
    await staffPage.screenshot({ path: path.join(OUT_DIR, 'staff-messages-compose.png') });
    console.log('  staff-messages-compose.png');

    await staffPage.close();
  } finally {
    await browser.close();
  }

  console.log('Screenshots saved to docs/screenshots/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
