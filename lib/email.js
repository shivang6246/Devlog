import nodemailer from 'nodemailer';

/**
 * Sends mail over SMTP (works with Gmail app passwords, Brevo, Mailtrap, SES…).
 *
 * If SMTP isn't configured:
 *   - development: the message is printed to the server console instead, so
 *     the app works out of the box;
 *   - production: sending throws, so a missing config is never silent.
 */
let transporter = globalThis.__mailer || null;

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = globalThis.__mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[DevLog] SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS).');
    }
    console.log(`\n[DevLog] SMTP not configured — email not sent. Would send to ${to}:\n  Subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}\n`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || `DevLog <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

const PURPOSE_COPY = {
  'verify-email': {
    subject: 'Your DevLog verification code',
    intro: 'Use this code to verify your email and finish creating your DevLog account:',
  },
  'reset-password': {
    subject: 'Your DevLog password reset code',
    intro: 'Use this code to reset your DevLog password:',
  },
};

export async function sendOtpEmail({ to, name, code, purpose, minutes }) {
  const copy = PURPOSE_COPY[purpose];
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const text = `${greeting}\n\n${copy.intro}\n\n    ${code}\n\nThe code expires in ${minutes} minutes. If you didn't request it, you can ignore this email.\n\n— DevLog`;
  const safeName = String(name || '').replace(/[<>&"']/g, '');
  const html = `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
        <tr><td>
          <p style="margin:0 0 24px;font-size:20px;font-weight:800">&lt;/&gt; DevLog</p>
          <p style="margin:0 0 12px;font-size:15px">${safeName ? `Hi ${safeName},` : 'Hi,'}</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5">${copy.intro}</p>
          <p style="margin:0 0 20px;font-size:32px;font-weight:800;letter-spacing:8px;font-family:Menlo,Consolas,monospace;background:#eef2ff;color:#3730a3;border-radius:8px;padding:14px;text-align:center">${code}</p>
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5">The code expires in ${minutes} minutes. If you didn't request it, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  await sendMail({ to, subject: copy.subject, text, html });
}
