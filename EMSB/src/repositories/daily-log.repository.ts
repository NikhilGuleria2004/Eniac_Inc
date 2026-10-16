import type { Collection, Filter } from "mongodb";
import type { DailyLog, DailyLogStatus, BillingType } from "../models/daily-log.js";
import { getCollection } from "../config/database.js";

export interface DailyLogListFilters {
  employeeId?: string;
  projectId?: string;
  projectIds?: string[];
  status?: DailyLogStatus;
  billingType?: BillingType;
  from?: Date;
  to?: Date;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class DailyLogRepository {
  private get collection(): Collection<DailyLog> {
    return getCollection<DailyLog>("daily_logs");
  }

  private async ensureIndexes(): Promise<void> {
    await this.collection.createIndex(
      { employeeId: 1, projectId: 1, workDateStr: 1 },
      { unique: true, partialFilterExpression: { deletedAt: null } }
    );
  }

  async generateId(): Promise<string> {
    const maxDoc = await this.collection.findOne({}, { sort: { dailyLogId: -1 }, projection: { dailyLogId: 1 } });
    let nextNum = 1;
    if (maxDoc?.dailyLogId) {
      const match = maxDoc.dailyLogId.match(/DL-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `DL-${String(nextNum).padStart(6, "0")}`;
  }

  async findById(dailyLogId: string): Promise<DailyLog | null> {
    return this.collection.findOne({ dailyLogId, deletedAt: { $exists: false } });
  }

  async findByEmployeeProjectDateRange(
    employeeId: string,
    projectId: string,
    dayStart: Date,
    dayEnd: Date
  ): Promise<DailyLog | null> {
    return this.collection.findOne({
      employeeId,
      projectId,
      workDate: { $gte: dayStart, $lt: dayEnd },
      deletedAt: { $exists: false }
    });
  }

  async findMany(
    filters: DailyLogListFilters
  ): Promise<{ logs: DailyLog[]; total: number }> {
    const { page = 1, pageSize = 20, ...queryFilters } = filters;
    const query: Filter<DailyLog> = { deletedAt: { $exists: false } };

    if (queryFilters.employeeId) query.employeeId = queryFilters.employeeId;
    if (queryFilters.projectId) query.projectId = queryFilters.projectId;
    if (queryFilters.projectIds) query.projectId = { $in: queryFilters.projectIds };
    if (queryFilters.status) query.status = queryFilters.status;
    if (queryFilters.billingType) query.billingType = queryFilters.billingType;
    if (queryFilters.from || queryFilters.to) {
      query.workDate = {};
      if (queryFilters.from) query.workDate.$gte = queryFilters.from;
      if (queryFilters.to) query.workDate.$lte = queryFilters.to;
    }
    if (queryFilters.search) {
      const rx = new RegExp(queryFilters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ description: rx }, { employeeName: rx }, { projectName: rx }, { dailyLogId: rx }];
    }

    const skip = (page - 1) * pageSize;
    const [logs, total] = await Promise.all([
      this.collection.find(query).sort({ workDate: -1, createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(query)
    ]);
    return { logs, total };
  }

  async create(log: Omit<DailyLog, "_id">): Promise<DailyLog> {
    await this.ensureIndexes();
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({ ...log, _id: new ObjectId() });
    return { ...log, _id: result.insertedId };
  }

  async update(dailyLogId: string, update: Partial<DailyLog>): Promise<DailyLog | null> {
    await this.collection.updateOne(
      { dailyLogId, deletedAt: { $exists: false } },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(dailyLogId);
  }

  async setStatus(dailyLogId: string, status: DailyLogStatus): Promise<DailyLog | null> {
    return this.update(dailyLogId, { status });
  }

  async softDelete(dailyLogId: string): Promise<boolean> {
    const result = await this.collection.updateOne(
      { dailyLogId, deletedAt: { $exists: false } },
      { $set: { deletedAt: new Date(), updatedAt: new Date() } }
    );
    return result.modifiedCount === 1;
  }
}
