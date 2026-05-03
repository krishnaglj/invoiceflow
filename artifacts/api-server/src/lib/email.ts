import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

const FROM =
  process.env.SMTP_FROM ?? "InvoiceFlow <noreply@invoiceflow.app>";

export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string | null | undefined,
  resetUrl: string
) {
  const firstName = toName?.split(" ")[0] ?? "there";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your InvoiceFlow password</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#4F46E5;border-radius:12px;width:44px;height:44px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:22px;font-weight:700;line-height:44px;">₹</span>
                  </td>
                  <td style="padding-left:10px;font-size:22px;font-weight:700;color:#0f172a;">InvoiceFlow</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);padding:48px 40px;">

              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#64748b;line-height:1.6;">
                We received a request to reset the password for your InvoiceFlow account
                associated with <strong style="color:#0f172a;">${toEmail}</strong>.
                Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;letter-spacing:0.01em;">
                      Reset my password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px;" />

              <!-- Security notice -->
              <p style="margin:0 0 12px;font-size:13px;color:#94a3b8;line-height:1.6;">
                <strong style="color:#64748b;">This link expires in 1 hour.</strong>
                If you didn't request a password reset, you can safely ignore this email —
                your password will not change.
              </p>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                If the button above doesn't work, copy and paste this URL into your browser:<br />
                <a href="${resetUrl}" style="color:#4F46E5;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} InvoiceFlow · Built for Indian businesses
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Hi ${firstName},

We received a request to reset the password for your InvoiceFlow account (${toEmail}).

Reset your password here:
${resetUrl}

This link expires in 1 hour. If you didn't request this, you can safely ignore this email.

— InvoiceFlow Team`;

  const transport = createTransport();
  if (!transport) {
    console.warn("[auth] SMTP not configured — password reset URL:", resetUrl);
    return;
  }

  await transport.sendMail({
    from: FROM,
    to: toEmail,
    subject: "Reset your InvoiceFlow password",
    text,
    html,
  });
}
