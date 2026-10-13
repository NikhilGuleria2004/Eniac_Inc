import type { Collection, Filter } from "mongodb";
import type { LeaveRequest, LeaveBalance, LeaveTypeConfig, LeaveStatus, LeaveType } from "../models/leave.js";
import { getCollection } from "../config/database.js";

export interface LeaveListFilters {
  employeeId?: string;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  page?: number;
  pageSize?: number;
}

export class LeaveRepository {
  private get requestsCollection(): Collection<LeaveRequest> {
    return getCollection<LeaveRequest>("leave_requests");
  }

  private get balancesCollection(): Collection<LeaveBalance> {
    return getCollection<LeaveBalance>("leave_balances");
  }

  private get typesCollection(): Collection<LeaveTypeConfig> {
    return getCollection<LeaveTypeConfig>("leave_types");
  }

  async findRequestById(requestId: string): Promise<LeaveRequest | null> {
    return this.requestsCollection.findOne({ requestId });
  }

  async requestExists(requestId: string): Promise<boolean> {
    const count = await this.requestsCollection.countDocuments({ requestId });
    return count > 0;
  }

  async findRequests(
    filters: LeaveListFilters
  ): Promise<{ requests: LeaveRequest[]; total: number }> {
    const { page = 1, pageSize = 20, ...queryFilters } = filters;
    const query: Filter<LeaveRequest> = {};

    if (queryFilters.employeeId) {
      query.employeeId = queryFilters.employeeId;
    }
    if (queryFilters.status) {
      query.status = queryFilters.status;
    }
    if (queryFilters.leaveType) {
      query.leaveType = queryFilters.leaveType;
    }

    const skip = (page - 1) * pageSize;

    const [requests, total] = await Promise.all([
      this.requestsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.requestsCollection.countDocuments(query)
    ]);

    return { requests, total };
  }

  async findRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return this.requestsCollection
      .find({ employeeId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findOverlappingRequests(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    excludeRequestId?: string
  ): Promise<LeaveRequest[]> {
    const query: Filter<LeaveRequest> = {
      employeeId,
      status: { $in: ["PENDING", "APPROVED"] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    };

    if (excludeRequestId) {
      query.requestId = { $ne: excludeRequestId };
    }

    return this.requestsCollection.find(query).toArray();
  }

  async createRequest(request: Omit<LeaveRequest, "_id">): Promise<LeaveRequest> {
    const { ObjectId } = await import("mongodb");
    const result = await this.requestsCollection.insertOne({
      ...request,
      _id: new ObjectId()
    });
    return { ...request, _id: result.insertedId };
  }

  async updateRequest(
    requestId: string,
    update: Partial<LeaveRequest>
  ): Promise<LeaveRequest | null> {
    await this.requestsCollection.updateOne(
      { requestId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findRequestById(requestId);
  }

  async findBalance(employeeId: string, leaveType: LeaveType): Promise<LeaveBalance | null> {
    return this.balancesCollection.findOne({ employeeId, leaveType });
  }

  async findBalancesByEmployee(employeeId: string): Promise<LeaveBalance[]> {
    return this.balancesCollection.find({ employeeId }).toArray();
  }

  async findBalances(
    filters: { employeeId?: string; leaveType?: LeaveType }
  ): Promise<LeaveBalance[]> {
    const query: Filter<LeaveBalance> = {};
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.leaveType) query.leaveType = filters.leaveType;
    return this.balancesCollection.find(query).toArray();
  }

  async upsertBalance(
    employeeId: string,
    leaveType: LeaveType,
    balance: number
  ): Promise<LeaveBalance> {
    const now = new Date();
    await this.balancesCollection.updateOne(
      { employeeId, leaveType },
      { $set: { balance, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    );
    const updated = await this.findBalance(employeeId, leaveType);
    return updated!;
  }

  async decrementBalance(
    employeeId: string,
    leaveType: LeaveType,
    days: number
  ): Promise<LeaveBalance | null> {
    const result = await this.balancesCollection.findOneAndUpdate(
      { employeeId, leaveType, balance: { $gte: days } },
      { $inc: { balance: -days }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result ?? null;
  }

  async incrementBalance(
    employeeId: string,
    leaveType: LeaveType,
    days: number
  ): Promise<LeaveBalance | null> {
    const result = await this.balancesCollection.findOneAndUpdate(
      { employeeId, leaveType },
      { $inc: { balance: days }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result ?? null;
  }

  async findLeaveTypeByCode(code: LeaveType): Promise<LeaveTypeConfig | null> {
    return this.typesCollection.findOne({ code });
  }

  async findLeaveTypes(): Promise<LeaveTypeConfig[]> {
    return this.typesCollection.find({ active: true }).toArray();
  }
}
