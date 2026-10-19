import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import type { MailAdapter, MailMessage } from "./mail.adapter.js";

/**
 * Production mail adapter: sends email over SMTP via nodemailer.
 *
 * Required configuration (see docs/OPERATIONS.md):
 * - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
 * - `MAIL_FROM` (optional, defaults to a no-reply address)
 * - `SMTP_SECURE=true` for implicit TLS (port 465)
 */
export class SmtpMailAdapter implements MailAdapter {
  readonly name = "smtp";
  private transporter: Transporter;

  constructor() {
    if (!env.SMTP_HOST) {
      throw new Error(
        "SMTP mail provider selected but SMTP_HOST is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or use MAIL_PROVIDER=log for development."
      );
    }

    if (!env.MAIL_FROM) {
      throw new Error(
        "SMTP mail provider selected but MAIL_FROM is not configured."
      );
    }

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: env.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType
      }))
    });
  }
}
