import { env } from "../../config/env.js";
import type { MailAdapter } from "./mail.adapter.js";
import { LogMailAdapter } from "./log.mail.adapter.js";
import { SmtpMailAdapter } from "./smtp.mail.adapter.js";
import { logger } from "../../logger/logger.js";

export { buildInvitationEmail, buildInvoiceEmail } from "./mail.adapter.js";
export type { InvitationEmailParams, MailAdapter, MailAttachment, MailMessage } from "./mail.adapter.js";

let cachedAdapter: MailAdapter | null = null;

/**
 * Returns the configured mail adapter. A misconfigured SMTP provider falls
 * back to the log adapter (with a warning) so invite creation is not blocked;
 * the service reports `emailSent: false` when the message could not be sent.
 */
export function getMailAdapter(): MailAdapter {
  if (cachedAdapter) return cachedAdapter;

  try {
    cachedAdapter = env.MAIL_PROVIDER === "smtp" ? new SmtpMailAdapter() : new LogMailAdapter();
  } catch (error) {
    logger.warn({ error }, "Mail provider unavailable, falling back to log adapter");
    cachedAdapter = new LogMailAdapter();
  }

  return cachedAdapter;
}

/** Resets the cached adapter (useful for tests). */
export function resetMailAdapter(): void {
  cachedAdapter = null;
}
