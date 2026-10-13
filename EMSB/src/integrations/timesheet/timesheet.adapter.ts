import type { Employee } from "../../models/employee.js";

/**
 * Result of a provisioning attempt against the external Timesheet system.
 */
export interface ProvisionResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

/**
 * Adapter for the external Timesheet application.
 *
 * In this phase this is a stub that simulates provisioning against an external
 * system. In production, these methods would call the Timesheet API. The EMSB
 * backend owns employee records; the Timesheet app should not mutate them
 * directly (EMSB.md §183).
 */
export class TimesheetAdapter {
  /**
   * Provision an employee in the Timesheet system.
   * Only called for ELIGIBLE employees (ACTIVE + BILLABLE + onboarding complete).
   */
  async provisionEmployee(employee: Employee): Promise<ProvisionResult> {
    // Stub: simulate a successful provisioning call.
    // A real implementation would POST to the Timesheet API here.
    return {
      success: true,
      externalId: `ts_${employee.employeeId}`
    };
  }

  /**
   * Disable an employee in the Timesheet system.
   */
  async disableEmployee(employeeId: string): Promise<ProvisionResult> {
    // Stub: simulate a successful disable call.
    return {
      success: true,
      externalId: `ts_${employeeId}`
    };
  }

  /**
   * Update an employee's details in the Timesheet system.
   */
  async updateEmployee(employee: Employee): Promise<ProvisionResult> {
    // Stub: simulate a successful update call.
    return {
      success: true,
      externalId: `ts_${employee.employeeId}`
    };
  }
}
