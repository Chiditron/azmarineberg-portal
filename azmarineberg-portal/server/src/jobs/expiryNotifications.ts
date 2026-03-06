import cron from 'node-cron';
import { pool } from '../db/pool.js';
import nodemailer from 'nodemailer';

const ALERT_DAYS = [90, 30, 14, 7, 3] as const;
const ALERT_TYPES = ['3_months', '1_month', '2_weeks', '7_days', '3_days'] as const;

function getAlertType(days: number): (typeof ALERT_TYPES)[number] | null {
  const idx = ALERT_DAYS.indexOf(days as 90 | 30 | 14 | 7 | 3);
  return idx >= 0 ? ALERT_TYPES[idx] : null;
}

async function runExpiryNotifications() {
  const client = await pool.connect();
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const days of ALERT_DAYS) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);

      const servicesResult = await client.query(
        `SELECT s.id, s.service_code, s.validity_end, s.company_id, c.company_name, c.email as company_email
         FROM services s
         JOIN companies c ON c.id = s.company_id
         WHERE s.status != 'closed'
         AND s.validity_end::date = $1::date`,
        [targetDate]
      );

      const alertType = getAlertType(days)!;

      for (const svc of servicesResult.rows) {
        const existing = await client.query(
          'SELECT id FROM expiry_alerts WHERE service_id = $1 AND alert_type = $2',
          [svc.id, alertType]
        );
        if (existing.rows.length > 0) continue;

        await client.query(
          `INSERT INTO expiry_alerts (service_id, alert_type, notified_client, notified_admin)
           VALUES ($1, $2, true, true)`,
          [svc.id, alertType]
        );

        const usersResult = await client.query(
          `SELECT id, email FROM users WHERE company_id = $1 AND role = 'client'`,
          [svc.company_id]
        );

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: false,
          auth: process.env.SMTP_USER ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          } : undefined,
        });

        const subject = `Azmarineberg: Service expiring in ${days} days - ${svc.service_code}`;
        const text = `Your service (${svc.service_code}) for ${svc.company_name} expires on ${svc.validity_end}. Please arrange for renewal.`;

        for (const u of usersResult.rows) {
          await client.query(
            `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
             VALUES ($1, $2, $3, 'expiry', 'service', $4)`,
            [u.id, `Service expiring in ${days} days`, text, svc.id]
          );
          try {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || 'noreply@azmarineberg.com',
              to: u.email,
              subject,
              text,
            });
          } catch (e) {
            console.error('Email send failed:', e);
          }
        }

        const admins = await client.query(
          `SELECT id, email FROM users WHERE role IN ('admin', 'super_admin')`
        );
        for (const a of admins.rows) {
          await client.query(
            `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
             VALUES ($1, $2, $3, 'expiry', 'service', $4)`,
            [a.id, `Service expiring: ${svc.company_name} - ${svc.service_code}`, text, svc.id]
          );
          try {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || 'noreply@azmarineberg.com',
              to: a.email,
              subject: `[Admin] ${subject}`,
              text,
            });
          } catch (e) {
            console.error('Admin email failed:', e);
          }
        }
      }
    }
  } catch (err) {
    console.error('Expiry notifications error:', err);
  } finally {
    client.release();
  }
}

export function startExpiryCron() {
  cron.schedule('0 8 * * *', runExpiryNotifications, { timezone: 'Africa/Lagos' });
  console.log('Expiry notification cron scheduled (daily 8am WAT)');
}
