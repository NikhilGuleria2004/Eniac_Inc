import type { Collection, Filter } from "mongodb";
import type { CompensationHistory, BillRateHistory } from "../models/compensation.js";
import { getCollection } from "../config/database.js";

export class CompensationRepository {
  private get compensationHistory(): Collection<CompensationHistory> {
    return getCollection<CompensationHistory>("employee_compensation_history");
  }

  private get billRateHistory(): Collection<BillRateHistory> {
    return getCollection<BillRateHistory>("employee_bill_rate_history");
  }

  async createCompensationHistory(
    history: Omit<CompensationHistory, "_id">
  ): Promise<CompensationHistory> {
    const { ObjectId } = await import("mongodb");
    const result = await this.compensationHistory.insertOne({
      ...history,
      _id: new ObjectId()
    });
    return { ...history, _id: result.insertedId };
  }

  async createBillRateHistory(
    history: Omit<BillRateHistory, "_id">
  ): Promise<BillRateHistory> {
    const { ObjectId } = await import("mongodb");
    const result = await this.billRateHistory.insertOne({
      ...history,
      _id: new ObjectId()
    });
    return { ...history, _id: result.insertedId };
  }

  async findCompensationHistory(
    filters: { employeeId?: string; page?: number; pageSize?: number }
  ): Promise<{ history: CompensationHistory[]; total: number }> {
    const { page = 1, pageSize = 20, employeeId } = filters;
    const query: Filter<CompensationHistory> = {};
    if (employeeId) query.employeeId = employeeId;

    const skip = (page - 1) * pageSize;

    const [history, total] = await Promise.all([
      this.compensationHistory
        .find(query)
        .sort({ effectiveFrom: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.compensationHistory.countDocuments(query)
    ]);

    return { history, total };
  }

  async findBillRateHistory(
    filters: { employeeId?: string; page?: number; pageSize?: number }
  ): Promise<{ history: BillRateHistory[]; total: number }> {
    const { page = 1, pageSize = 20, employeeId } = filters;
    const query: Filter<BillRateHistory> = {};
    if (employeeId) query.employeeId = employeeId;

    const skip = (page - 1) * pageSize;

    const [history, total] = await Promise.all([
      this.billRateHistory
        .find(query)
        .sort({ effectiveFrom: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.billRateHistory.countDocuments(query)
    ]);

    return { history, total };
  }

  async getLatestCompensationHistoryId(): Promise<string> {
    const maxDoc = await this.compensationHistory
      .findOne({}, { sort: { historyId: -1 }, projection: { historyId: 1 } });
    return maxDoc?.historyId ?? "";
  }

  async getLatestBillRateHistoryId(): Promise<string> {
    const maxDoc = await this.billRateHistory
      .findOne({}, { sort: { historyId: -1 }, projection: { historyId: 1 } });
    return maxDoc?.historyId ?? "";
  }
}
