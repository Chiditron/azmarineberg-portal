import cron from 'node-cron';
import { pool } from '../db/pool.js';
import nodemailer from 'nodemailer';

async function runReportReminders() {
  const client = await pool.connect();
  try {
    const today = new Date();
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);

    const overdueResult = await client.query(
      `SELECT rc.id, rc.due_date, rc.cycle_type, s.service_code, c.company_name, c.email
       FROM report_cycles rc
       JOIN services s ON s.id = rc.service_id
       JOIN companies c ON c.id = s.company_id
       WHERE rc.status NOT IN ('submitted', 'acknowledged')
       AND rc.due_date < $1`,
      [today]
    );

    const upcomingResult = await client.query(
      `SELECT rc.id, rc.due_date, rc.cycle_type, s.service_code, c.company_name
       FROM report_cycles rc
       JOIN services s ON s.id = rc.service_id
       JOIN companies c ON c.id = s.company_id
       WHERE rc.status NOT IN ('submitted', 'acknowledged')
       AND rc.due_date >= $1 AND rc.due_date <= $2`,
      [today, in7Days]
    );

    const admins = await client.query(
      `SELECT id, email FROM users WHERE role IN ('admin', 'super_admin', 'staff')`
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

    for (const r of overdueResult.rows) {
      for (const a of admins.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
           VALUES ($1, $2, $3, 'report_overdue', 'report_cycle', $4)`,
          [a.id, 'Overdue report', `${r.company_name} - ${r.service_code} (${r.cycle_type}) was due ${r.due_date}`, r.id]
        );
      }
    }

    for (const r of upcomingResult.rows) {
      for (const a of admins.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, entity_type, entity_id)
           VALUES ($1, $2, $3, 'report_upcoming', 'report_cycle', $4)`,
          [a.id, 'Report due soon', `${r.company_name} - ${r.service_code} (${r.cycle_type}) due ${r.due_date}`, r.id]
        );
      }
    }
  } catch (err) {
    console.error('Report reminders error:', err);
  } finally {
    client.release();
  }
}

export function startReportRemindersCron() {
  cron.schedule('0 9 * * *', runReportReminders, { timezone: 'Africa/Lagos' });
  console.log('Report reminders cron scheduled (daily 9am WAT)');
}
