import { Decimal128 } from "mongodb";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { CompensationRepository } from "../repositories/compensation.repository.js";
import type { Employee } from "../models/employee.js";
import type { Role } from "../config/constants.js";
import { NotFoundError } from "../utils/errors.js";
import { toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import type { UpdateCompensationInput } from "../schemas/compensation.schemas.js";

export interface CompensationDTO {
  employeeId: string;
  salary: {
    currency: string;
    amount: number;
    payFrequency: string;
  } | null;
  billRate: {
    currency: string;
    amount: number;
    unit: string;
  } | null;
}

function toDecimal128(amount: number): Decimal128 {
  return Decimal128.fromString(amount.toString());
}

function decimalToNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number") return value;
  if (value instanceof Decimal128) {
    return Number(value.toString());
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return undefined;
}

export class CompensationService {
  constructor(
    private employeeRepository: EmployeeRepository,
    private compensationRepository: CompensationRepository
  ) {}

  async getCompensation(employeeId: string): Promise<CompensationDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    return this.toDTO(employee);
  }

  async updateCompensation(
    employeeId: string,
    input: UpdateCompensationInput,
    actorRole: Role,
    actorUserId: string
  ): Promise<CompensationDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const now = new Date();
    const update: Partial<Employee> = {};

    if (input.salary) {
      // Close previous compensation history
      await this.closePreviousCompensation(employeeId, now);
      // Write new history record
      const historyId = await this.generateCompensationHistoryId();
      await this.compensationRepository.createCompensationHistory({
        historyId,
        employeeId,
        effectiveFrom: now,
        salary: toDecimal128(input.salary.amount),
        currency: input.salary.currency,
        payFrequency: input.salary.payFrequency,
        changedBy: actorRole,
        reason: input.reason,
        createdAt: now
      });
      // Update employee
      update.compensation = {
        currency: input.salary.currency,
        salary: toDecimal128(input.salary.amount),
        payFrequency: input.salary.payFrequency
      };
      await writeAuditLog(actorRole, "salary.updated", "employee", employeeId, actorUserId);
    }

    if (input.billRate) {
      await this.closePreviousBillRate(employeeId, now);
      const historyId = await this.generateBillRateHistoryId();
      await this.compensationRepository.createBillRateHistory({
        historyId,
        employeeId,
        effectiveFrom: now,
        billRate: toDecimal128(input.billRate.amount),
        currency: input.billRate.currency,
        unit: input.billRate.unit,
        changedBy: actorRole,
        reason: input.reason,
        createdAt: now
      });
      update.billRate = {
        currency: input.billRate.currency,
        amount: toDecimal128(input.billRate.amount),
        unit: input.billRate.unit
      };
      await writeAuditLog(actorRole, "bill_rate.updated", "employee", employeeId, actorUserId);
    }

    const updated = await this.employeeRepository.update(employeeId, update);
    if (!updated) {
      throw new NotFoundError("Employee was not found.");
    }

    return this.toDTO(updated);
  }

  async getCompensationHistory(
    employeeId: string,
    page: number,
    pageSize: number
  ): Promise<{ history: unknown[]; total: number }> {
    const { history, total } = await this.compensationRepository.findCompensationHistory({
      employeeId,
      page,
      pageSize
    });
    return {
      history: history.map((h) => ({
        historyId: h.historyId,
        employeeId: h.employeeId,
        effectiveFrom: toISO(h.effectiveFrom),
        effectiveTo: toISO(h.effectiveTo),
        amount: decimalToNumber(h.salary),
        currency: h.currency,
        payFrequency: h.payFrequency,
        changedBy: h.changedBy,
        reason: h.reason,
        createdAt: toISO(h.createdAt)
      })),
      total
    };
  }

  async getBillRateHistory(
    employeeId: string,
    page: number,
    pageSize: number
  ): Promise<{ history: unknown[]; total: number }> {
    const { history, total } = await this.compensationRepository.findBillRateHistory({
      employeeId,
      page,
      pageSize
    });
    return {
      history: history.map((h) => ({
        historyId: h.historyId,
        employeeId: h.employeeId,
        effectiveFrom: toISO(h.effectiveFrom),
        effectiveTo: toISO(h.effectiveTo),
        amount: decimalToNumber(h.billRate),
        currency: h.currency,
        unit: h.unit,
        changedBy: h.changedBy,
        reason: h.reason,
        createdAt: toISO(h.createdAt)
      })),
      total
    };
  }

  private async closePreviousCompensation(employeeId: string, now: Date): Promise<void> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    await db.collection("employee_compensation_history").updateOne(
      { employeeId, effectiveTo: { $exists: false } },
      { $set: { effectiveTo: now } }
    );
  }

  private async closePreviousBillRate(employeeId: string, now: Date): Promise<void> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    await db.collection("employee_bill_rate_history").updateOne(
      { employeeId, effectiveTo: { $exists: false } },
      { $set: { effectiveTo: now } }
    );
  }

  private toDTO(employee: Employee): CompensationDTO {
    const salaryAmount = employee.compensation?.salary;
    const billRateAmount = employee.billRate?.amount;

    return {
      employeeId: employee.employeeId,
      salary: employee.compensation && employee.compensation.currency
        ? {
            currency: employee.compensation.currency,
            amount: decimalToNumber(salaryAmount) ?? 0,
            payFrequency: employee.compensation.payFrequency ?? ""
          }
        : null,
      billRate: employee.billRate && employee.billRate.currency
        ? {
            currency: employee.billRate.currency,
            amount: decimalToNumber(billRateAmount) ?? 0,
            unit: employee.billRate.unit ?? ""
          }
        : null
    };
  }

  private async generateCompensationHistoryId(): Promise<string> {
    const maxId = await this.compensationRepository.getLatestCompensationHistoryId();
    let nextNum = 1;
    const match = maxId.match(/CMP-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
    return `CMP-${String(nextNum).padStart(4, "0")}`;
  }

  private async generateBillRateHistoryId(): Promise<string> {
    const maxId = await this.compensationRepository.getLatestBillRateHistoryId();
    let nextNum = 1;
    const match = maxId.match(/BRH-(\d+)/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
    return `BRH-${String(nextNum).padStart(4, "0")}`;
  }
}
