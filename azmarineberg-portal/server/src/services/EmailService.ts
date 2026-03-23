import nodemailer, { Transporter } from 'nodemailer';

// SMTP configuration: see server/.env.example (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM; optional SMTP_SECURE).

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** True when outbound email can be attempted (production hosts must set all required vars). */
export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();
  return Boolean(host && user && pass && from);
}

export function smtpConfigurationHint(): string {
  return (
    'Set SMTP_HOST, SMTP_PORT, SMTP_USER (SendGrid: apikey), SMTP_PASS (API key), SMTP_FROM (verified sender). ' +
    'If connection times out (ETIMEDOUT), try SMTP_PORT=465 and SMTP_SECURE=true. ' +
    'Configure on your API host (e.g. Render) and redeploy.'
  );
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const secureEnv = process.env.SMTP_SECURE?.trim().toLowerCase();
  const useImplicitTls =
    port === 465 || secureEnv === 'true' || secureEnv === '1';

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: useImplicitTls,
    auth: user && pass ? { user, pass } : undefined,
    // Render → SendGrid often fails with ETIMEDOUT on CONN with defaults; cloud paths can be slow.
    connectionTimeout: 60_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
    requireTLS: !useImplicitTls && port === 587,
    tls: {
      minVersion: 'TLSv1.2',
      servername: host,
    },
  });
  return cachedTransporter;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!isSmtpConfigured()) {
    const msg = `Email not sent: SMTP is not configured. ${smtpConfigurationHint()}`;
    console.error(msg);
    throw new Error(msg);
  }

  const transporter = getTransporter();
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM!.trim(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    console.log('Email sent:', { to: input.to, messageId: info.messageId, subject: input.subject });
  } catch (err) {
    console.error('Email send failed:', {
      to: input.to,
      subject: input.subject,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
