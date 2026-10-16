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
  attachments?: MailAttachment[];
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

/**
 * Builds the email sent when an invoice is dispatched to a client, with the
 * rendered invoice PDF attached.
 */
export function buildInvoiceEmail(params: {
  to: string;
  invoiceNumber: string;
  clientName: string;
  subject: string;
  totalDue: string;
  dueDate: string;
  paymentTerms: string;
  attachment?: MailAttachment;
}): MailMessage {
  const subjectText = params.subject || `Invoice ${params.invoiceNumber}`;
  const text = [
    `Dear ${params.clientName},`,
    "",
    `Please find attached invoice ${params.invoiceNumber} for ${subjectText}.`,
    "",
    `Total Due: ${params.totalDue} (${params.paymentTerms})`,
    `Due Date: ${params.dueDate}`,
    "",
    "Thank you for your business.",
    "",
    "— Eniac Inc."
  ].join("\n");

  const html = [
    `<p>Dear ${escapeHtml(params.clientName)},</p>`,
    `<p>Please find attached invoice <strong>${escapeHtml(params.invoiceNumber)}</strong> for ${escapeHtml(subjectText)}.</p>`,
    `<p><strong>Total Due:</strong> ${escapeHtml(params.totalDue)} (${escapeHtml(params.paymentTerms)})<br>`,
    `<strong>Due Date:</strong> ${escapeHtml(params.dueDate)}</p>`,
    "<p>Thank you for your business.</p>",
    "<p>— Eniac Inc.</p>"
  ].join("\n");

  return {
    to: params.to,
    subject: `Invoice ${params.invoiceNumber} from Eniac Inc.`,
    text,
    html,
    attachments: params.attachment ? [params.attachment] : []
  };
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
