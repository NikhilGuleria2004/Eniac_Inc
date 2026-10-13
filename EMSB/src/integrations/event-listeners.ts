import { integrationEvents } from "./events.js";
import { logger } from "../logger/logger.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { TimesheetRepository } from "../repositories/timesheet.repository.js";
import { TimesheetService } from "../services/timesheet.service.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { NotificationService } from "../services/notification.service.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TimesheetAdapter } from "./timesheet/timesheet.adapter.js";
import type {
  EmployeeActivatedEvent,
  EmployeeTimesheetEligibilityChangedEvent
} from "./events.js";

let registered = false;

/**
 * Wires integration-event listeners once per process. Called by the server
 * bootstrap (after the database is connected) and by test setup. Listener
 * failures are logged by the bus and never surface to the emitter.
 */
export function registerEventListeners(): void {
  if (registered) return;
  registered = true;

  const employeeRepository = new EmployeeRepository();
  const timesheetService = new TimesheetService(
    new TimesheetRepository(),
    employeeRepository,
    new TimesheetAdapter()
  );
  const notificationService = new NotificationService(
    new NotificationRepository(),
    new UserRepository()
  );

  integrationEvents.on(
    "EmployeeTimesheetEligibilityChanged",
    async (event: EmployeeTimesheetEligibilityChangedEvent) => {
      const employee = await employeeRepository.findByEmployeeId(event.employeeId);
      if (!employee) {
        logger.warn(
          { employeeId: event.employeeId },
          "Timesheet eligibility changed: employee not found, skipping"
        );
        return;
      }
      await timesheetService.onEligibilityChanged(employee);
    }
  );

  integrationEvents.on(
    "EmployeeActivated",
    async (event: EmployeeActivatedEvent) => {
      await notificationService.onEmployeeActivated(
        event.employeeId,
        event.employeeName,
        event.managerId
      );
    }
  );

  logger.debug("Integration event listeners registered");
}
