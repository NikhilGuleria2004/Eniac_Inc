export interface InvitationEmailParams {
  employeeName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Adapter for outbound email, following the same stub-adapter pattern as the
 * Timesheet integration (`integrations/timesheet/timesheet.adapter.ts`).
 *
 * Two implementations exist:
 * - `LogMailAdapter` (development): prints the message to the server log.
 * - `SmtpMailAdapter` (production): sends via SMTP using nodemailer.
 */
export interface MailAdapter {
  readonly name: string;
  send(message: MailMessage): Promise<void>;
}

export function buildInvitationEmail(params: InvitationEmailParams): MailMessage {
  const subject = "You're invited to set up your Eniac Inc. account";
  const expires = params.expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const text = [
    `Hi ${params.employeeName},`,
    "",
    "Your onboarding at Eniac Inc. is complete and your account has been created.",
    `Role: ${params.role}`,
    "",
    "Set up your password to activate your account:",
    params.inviteUrl,
    "",
    `This invitation link expires on ${expires}. If it expires, contact your HR administrator for a new one.`,
    "",
    "— Eniac Inc. Employee Management System"
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(params.employeeName)},</p>`,
    "<p>Your onboarding at Eniac Inc. is complete and your account has been created.</p>",
    `<p><strong>Role:</strong> ${escapeHtml(params.role)}</p>`,
    `<p><a href="${escapeHtml(params.inviteUrl)}">Set up your password</a> to activate your account.</p>`,
    `<p style="color:#666;font-size:12px;">This invitation link expires on ${expires}. If it expires, contact your HR administrator for a new one.</p>`,
    "<p>— Eniac Inc. Employee Management System</p>"
  ].join("\n");

  return { to: "", subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
