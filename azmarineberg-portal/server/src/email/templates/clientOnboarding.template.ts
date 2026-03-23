interface ClientOnboardingTemplateInput {
  onboardingUrl: string;
  companyName: string;
  hoursValid: number;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderClientOnboardingTemplate(
  input: ClientOnboardingTemplateInput
): { subject: string; html: string; text: string } {
  const { onboardingUrl, companyName, hoursValid } = input;
  const safeCompanyName = escapeHtml(companyName);
  const subject = 'Welcome to Azmarineberg. Time to set your password';

  const text = [
    `Welcome to Azmarineberg Portal for ${companyName}.`,
    '',
    'Set your password using this secure link:',
    onboardingUrl,
    '',
    `This link expires in ${hoursValid} hours and can only be used once.`,
    '',
    'If you did not expect this email, you can ignore it.',
    '',
    'Azmarineberg Team',
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;border:1px solid #e5e7eb;overflow:hidden;">
            <tr>
              <td style="background:#0d5c2e;color:#ffffff;padding:16px 24px;font-size:20px;font-weight:700;">Azmarineberg</td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;color:#111827;">Set your password</h1>
                <p style="margin:0 0 16px 0;line-height:1.5;color:#374151;">
                  Welcome to Azmarineberg Portal for <strong>${safeCompanyName}</strong>.
                </p>
                <p style="margin:0 0 16px 0;">
                  <a href="${onboardingUrl}" style="display:inline-block;background:#0d5c2e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:600;">Set Password</a>
                </p>
                <p style="margin:0 0 16px 0;line-height:1.5;color:#374151;">This link expires in ${hoursValid} hours and can only be used once.</p>
                <p style="margin:0 0 8px 0;line-height:1.5;color:#374151;">If the button above does not work, copy and paste this URL into your browser:</p>
                <p style="margin:0 0 16px 0;word-break:break-all;color:#0d5c2e;">${onboardingUrl}</p>
                <p style="margin:0;line-height:1.5;color:#6b7280;">If you did not expect this email, you can ignore it.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
