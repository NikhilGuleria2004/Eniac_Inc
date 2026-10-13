import { NotificationService } from "../services/notification.service.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { logger } from "../logger/logger.js";

let sharedService: NotificationService | null = null;

/**
 * Returns a process-wide singleton NotificationService, lazily initialized.
 * Replaces the dynamic `await import(...)` pattern that was used across
 * service emit* methods to avoid circular imports — no cycle exists because
 * NotificationService only depends on repositories, models, and utils.
 */
function getNotificationService(): NotificationService {
  if (!sharedService) {
    sharedService = new NotificationService(
      new NotificationRepository(),
      new UserRepository()
    );
  }
  return sharedService;
}

/**
 * Safely dispatches a notification event. Any failure is logged and swallowed
 * so that a notification side-effect never breaks the originating business write.
 *
 * Usage:
 *   await emitNotification("onLeaveRequestSubmitted", { employeeId }, ...args);
 */
export async function emitNotification(
  method: keyof NotificationService,
  context: Record<string, unknown>,
  ...args: unknown[]
): Promise<void> {
  try {
    const service = getNotificationService();
    const fn = service[method] as (...args: unknown[]) => Promise<void>;
    await fn.apply(service, args);
  } catch (error) {
    logger.warn(
      { error, ...context },
      `Notification emit failed via ${method}`
    );
  }
}
