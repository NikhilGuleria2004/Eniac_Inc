import type { Collection, Filter } from "mongodb";
import type { Timesheet } from "../models/billing-timesheet.js";
import type { TimesheetStatus } from "../config/constants.js";
import { getCollection } from "../config/database.js";

export interface TimesheetListFilters {
  employeeId?: string;
  employeeIds?: string[];
  status?: TimesheetStatus;
  periodStart?: string;
  page?: number;
  pageSize?: number;
}

export class BillingTimesheetRepository {
  private get collection(): Collection<Timesheet> {
    return getCollection<Timesheet>("timesheets");
  }

  private async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ timesheetId: 1 }, { unique: true });
    await this.collection.createIndex({ employeeId: 1, periodStart: 1, periodEnd: 1 }, { unique: true });
    await this.collection.createIndex({ status: 1, periodStart: 1 });
    await this.collection.createIndex({ employeeId: 1, periodStart: 1 });
  }

  async generateId(): Promise<string> {
    const maxDoc = await this.collection.findOne({}, { sort: { timesheetId: -1 }, projection: { timesheetId: 1 } });
    let nextNum = 1;
    if (maxDoc?.timesheetId) {
      const match = maxDoc.timesheetId.match(/TS-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `TS-${String(nextNum).padStart(6, "0")}`;
  }

  async findById(timesheetId: string): Promise<Timesheet | null> {
    return this.collection.findOne({ timesheetId });
  }

  async findByEmployeePeriod(employeeId: string, periodStart: string, periodEnd: string): Promise<Timesheet | null> {
    return this.collection.findOne({ employeeId, periodStart, periodEnd });
  }

  async findMany(
    filters: TimesheetListFilters
  ): Promise<{ timesheets: Timesheet[]; total: number }> {
    const { page = 1, pageSize = 20, ...queryFilters } = filters;
    const query: Filter<Timesheet> = {};
    if (queryFilters.employeeId) query.employeeId = queryFilters.employeeId;
    if (queryFilters.employeeIds) query.employeeId = { $in: queryFilters.employeeIds };
    if (queryFilters.status) query.status = queryFilters.status;
    if (queryFilters.periodStart) query.periodStart = queryFilters.periodStart;

    const skip = (page - 1) * pageSize;
    const [timesheets, total] = await Promise.all([
      this.collection.find(query).sort({ periodStart: -1, createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(query)
    ]);
    return { timesheets, total };
  }

  async create(ts: Omit<Timesheet, "_id">): Promise<Timesheet> {
    await this.ensureIndexes();
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({ ...ts, _id: new ObjectId() });
    return { ...ts, _id: result.insertedId };
  }

  async update(timesheetId: string, update: Partial<Timesheet>): Promise<Timesheet | null> {
    await this.collection.updateOne(
      { timesheetId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(timesheetId);
  }
}
