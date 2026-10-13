import { EventEmitter } from "events";
import { logger } from "../logger/logger.js";

export interface EmployeeTimesheetEligibilityChangedEvent {
  employeeId: string;
  occurredAt: Date;
}

export interface EmployeeActivatedEvent {
  employeeId: string;
  employeeName: string;
  managerId?: string;
  occurredAt: Date;
}

export interface IntegrationEvents {
  employeeTimesheetEligibilityChanged(
    event: EmployeeTimesheetEligibilityChangedEvent
  ): Promise<void>;
  employeeActivated(event: EmployeeActivatedEvent): Promise<void>;
}

/**
 * In-process integration event bus. Publishing waits for all listeners to
 * settle so side effects complete before the originating request responds.
 * Listener failures are logged and swallowed: a failed side effect must never
 * break the business write or crash the process.
 */
class IntegrationEventBus extends EventEmitter implements IntegrationEvents {
  private async publish<T>(eventName: string, event: T): Promise<void> {
    await Promise.all(
      this.listeners(eventName).map(async (listener) => {
        try {
          await listener(event);
        } catch (error) {
          logger.warn({ error, event: eventName }, `Integration listener for ${eventName} failed`);
        }
      })
    );
  }

  async employeeTimesheetEligibilityChanged(
    event: EmployeeTimesheetEligibilityChangedEvent
  ): Promise<void> {
    await this.publish("EmployeeTimesheetEligibilityChanged", event);
  }

  async employeeActivated(event: EmployeeActivatedEvent): Promise<void> {
    await this.publish("EmployeeActivated", event);
  }
}

export const integrationEvents = new IntegrationEventBus();
