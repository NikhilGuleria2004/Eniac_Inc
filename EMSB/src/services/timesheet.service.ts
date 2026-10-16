import { TimesheetRepository } from "../repositories/timesheet.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import type { Employee } from "../models/employee.js";
import type { TimesheetProvisioningStatus } from "../models/timesheet.js";
import type { Role } from "../config/constants.js";
import { NotFoundError, BusinessRuleError } from "../utils/errors.js";
import { toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import { TimesheetAdapter } from "../integrations/timesheet/timesheet.adapter.js";
import { computeTimesheetEligibility } from "../utils/timesheet-eligibility.js";
import { emitNotification } from "../utils/notification-emitter.js";

export interface TimesheetStatusDTO {
  employeeId: string;
  status: TimesheetProvisioningStatus;
  eligible: boolean;
  reason?: string;
  failureReason?: string;
  lastAttemptAt?: string;
  provisionedAt?: string;
  disabledAt?: string;
}

export class TimesheetService {
  constructor(
    private timesheetRepository: TimesheetRepository,
    private employeeRepository: EmployeeRepository,
    private adapter: TimesheetAdapter
  ) {}

  /**
   * Calculate eligibility. Delegates to the shared predicate
   * (utils/timesheet-eligibility.ts) so the /timesheet endpoint and the
   * employee DTO can never disagree (Finding #2). Includes the onboarding
   * completion check and a stored provisioning-failure block.
   */
  async calculateEligibility(employee: Employee): Promise<{ eligible: boolean; reason?: string }> {
    const onboardingComplete = await this.isOnboardingComplete(employee.employeeId);
    return computeTimesheetEligibility(
      {
        employmentStatus: employee.employmentStatus,
        billingStatus: employee.billingStatus,
        timesheetEligibility: employee.timesheetEligibility
      },
      onboardingComplete
    );
  }

  private async isOnboardingComplete(employeeId: string): Promise<boolean> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const record = await db.collection("onboarding_records").findOne({ employeeId });
    // No onboarding record means the employee was activated directly (complete).
    if (!record) return true;
    return record.status === "COMPLETED";
  }

  async getStatus(employeeId: string): Promise<TimesheetStatusDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const { eligible, reason } = await this.calculateEligibility(employee);

    let record = await this.timesheetRepository.findByEmployeeId(employeeId);

    if (!record) {
      record = await this.timesheetRepository.create({
        employeeId,
        status: eligible ? "ELIGIBLE" : "NOT_ELIGIBLE",
        eligible,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return this.toDTO(record, reason);
  }

  /**
   * Manual provisioning retry. Only allowed when the current status is FAILED.
   */
  async provision(employeeId: string, actorRole: Role, actorUserId: string): Promise<TimesheetStatusDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const record = await this.timesheetRepository.findByEmployeeId(employeeId);
    if (!record) {
      throw new BusinessRuleError(
        "No timesheet provisioning record found. Check status first.",
        "NO_PROVISIONING_RECORD"
      );
    }

     if (record.status !== "FAILED") {
       throw new BusinessRuleError(
         `Manual retry is only allowed from FAILED state. Current status: ${record.status}`,
         "INVALID_PROVISION_STATE"
       );
     }

     // D5: Clear any stale FAILED flag on the employee model before re-attempting,
     // so a stale block from a prior failure does not suppress eligibility.
     await this.employeeRepository.update(employeeId, {
       timesheetEligibility: undefined
     });

     // Transition to PROVISIONING (transient)
    await this.timesheetRepository.updateStatus(employeeId, "PROVISIONING", {
      lastAttemptAt: new Date()
    });

    const result = await this.adapter.provisionEmployee(employee);

    if (result.success) {
      const updated = await this.timesheetRepository.updateStatus(employeeId, "PROVISIONED", {
        provisionedAt: new Date(),
        failureReason: undefined
      });
      // Persist the provisioning outcome on the employee so the eligibility
      // DTO reflects it (clears any prior FAILED block on a successful retry).
      await this.employeeRepository.update(employeeId, {
        timesheetEligibility: { eligible: true, eligibleAt: new Date() }
      });
      await writeAuditLog(actorRole, "timesheet.provisioned", "timesheet", employeeId, actorUserId);
      return this.toDTO(updated);
    }

    const updated = await this.timesheetRepository.updateStatus(employeeId, "FAILED", {
      failureReason: result.error ?? "Provisioning failed",
      lastAttemptAt: new Date()
    });
    await this.employeeRepository.update(employeeId, {
      timesheetEligibility: { eligible: false, eligibleAt: new Date(), reason: "FAILED" }
    });
    await writeAuditLog(actorRole, "timesheet.provision_failed", "timesheet", employeeId, actorUserId);
    await this.emitOnTimesheetProvisioningFailed(employee, result.error);

    return this.toDTO(updated);
  }

  async disable(employeeId: string, actorRole: Role, actorUserId: string): Promise<TimesheetStatusDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const result = await this.adapter.disableEmployee(employeeId);

    const updated = await this.timesheetRepository.updateStatus(employeeId, "DISABLED", {
      disabledAt: new Date(),
      eligible: false
    });

    await writeAuditLog(actorRole, "timesheet.disabled", "timesheet", employeeId, actorUserId);

    if (!result.success) {
      throw new BusinessRuleError(
        result.error ?? "Failed to disable timesheet provisioning",
        "TIMESHEET_DISABLE_FAILED"
      );
    }

    return this.toDTO(updated);
  }

  /**
   * Recompute and persist timesheet eligibility for an employee.
   * Called by the EmployeeTimesheetEligibilityChanged event listener when an
   * employee's status/billing changes (e.g. on activation).
   */
  async onEligibilityChanged(employee: Employee): Promise<void> {
    const { eligible } = await this.calculateEligibility(employee);

    const existing = await this.timesheetRepository.findByEmployeeId(employee.employeeId);
    if (existing && existing.status !== "DISABLED" && existing.status !== "PROVISIONED") {
      await this.timesheetRepository.updateStatus(
        employee.employeeId,
        eligible ? "ELIGIBLE" : "NOT_ELIGIBLE",
        { eligible }
      );
    } else if (!existing) {
      await this.timesheetRepository.create({
        employeeId: employee.employeeId,
        status: eligible ? "ELIGIBLE" : "NOT_ELIGIBLE",
        eligible,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  private async emitOnTimesheetProvisioningFailed(
    employee: Employee,
    failureReason?: string
  ): Promise<void> {
    await emitNotification(
      "onTimesheetProvisioningFailed",
      { employeeId: employee.employeeId },
      employee.employeeId,
      `${employee.firstName} ${employee.lastName}`,
      failureReason
    );
  }

  private toDTO(
    record: { employeeId: string; status: TimesheetProvisioningStatus; eligible: boolean; failureReason?: string; lastAttemptAt?: Date; provisionedAt?: Date; disabledAt?: Date },
    reason?: string
  ): TimesheetStatusDTO {
    return {
      employeeId: record.employeeId,
      status: record.status,
      eligible: record.eligible,
      reason,
      failureReason: record.failureReason,
      lastAttemptAt: toISO(record.lastAttemptAt),
      provisionedAt: toISO(record.provisionedAt),
      disabledAt: toISO(record.disabledAt)
    };
  }
}
