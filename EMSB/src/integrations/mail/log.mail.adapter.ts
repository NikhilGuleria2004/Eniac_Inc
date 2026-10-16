import type { MailAdapter, MailMessage } from "./mail.adapter.js";
import { logger } from "../../logger/logger.js";

/**
 * Development mail adapter: prints the full message (including invite links)
 * to the server log instead of sending real email.
 */
export class LogMailAdapter implements MailAdapter {
  readonly name = "log";

  async send(message: MailMessage): Promise<void> {
    const attachments = message.attachments?.map((a) => `${a.filename} (${a.content.length} bytes)`) ?? [];
    logger.info(
      {
        to: message.to,
        subject: message.subject,
        body: message.text,
        attachments
      },
      "[MAIL:log] Outgoing email (not actually sent)"
    );
    console.log("\n----- OUTGOING EMAIL (log adapter) -----");
    console.log(`To: ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    if (attachments.length > 0) {
      console.log(`Attachments: ${attachments.join(", ")}`);
    }
    console.log(message.text);
    console.log("------------------------------------------\n");
  }
}
