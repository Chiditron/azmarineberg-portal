import nodemailer, { Transporter } from 'nodemailer';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
  return cachedTransporter;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const transporter = getTransporter();
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@azmarineberg.com',
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
