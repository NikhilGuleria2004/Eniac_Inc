import type { Collection, Filter } from "mongodb";
import type { OnboardingRecord, OnboardingStage, OnboardingStatus } from "../models/onboarding.js";
import { getCollection } from "../config/database.js";
import { escapeRegex } from "../utils/validation.js";

export interface OnboardingListFilters {
  status?: OnboardingStatus;
  stage?: OnboardingStage;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class OnboardingRepository {
  private get collection(): Collection<OnboardingRecord> {
    return getCollection<OnboardingRecord>("onboarding_records");
  }

  async findByEmployeeId(employeeId: string): Promise<OnboardingRecord | null> {
    return this.collection.findOne({ employeeId });
  }

  /**
   * Batch lookup of onboarding records for the given employees. Used by the
   * employee list/detail DTO to compute timesheet eligibility without N+1
   * queries (mirrors UserRepository.findByEmployeeIds).
   */
  async findByEmployeeIds(
    employeeIds: string[]
  ): Promise<Pick<OnboardingRecord, "employeeId" | "status">[]> {
    if (employeeIds.length === 0) return [];
    const records = await this.collection
      .find({ employeeId: { $in: employeeIds } })
      .project({ employeeId: 1, status: 1 })
      .toArray();
    return records as Pick<OnboardingRecord, "employeeId" | "status">[];
  }

  async findMany(
    filters: OnboardingListFilters
  ): Promise<{ records: OnboardingRecord[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      ...queryFilters
    } = filters;

    const query: Filter<OnboardingRecord> = {};

    if (queryFilters.status) {
      query.status = queryFilters.status;
    }
    if (queryFilters.stage) {
      query.currentStage = queryFilters.stage;
    }
    if (queryFilters.search) {
      const searchRegex = { $regex: escapeRegex(queryFilters.search), $options: "i" };
      query.$or = [
        { employeeId: searchRegex },
        { reviewNotes: searchRegex }
      ];
    }

    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.collection.countDocuments(query)
    ]);

    return { records, total };
  }

  async create(record: Omit<OnboardingRecord, "_id">): Promise<OnboardingRecord> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...record,
      _id: new ObjectId()
    });
    return { ...record, _id: result.insertedId };
  }

  async update(
    employeeId: string,
    update: Partial<OnboardingRecord>
  ): Promise<OnboardingRecord | null> {
    await this.collection.updateOne(
      { employeeId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findByEmployeeId(employeeId);
  }

  async updateStageAndStatus(
    employeeId: string,
    stage: OnboardingStage,
    status: OnboardingStatus,
    additionalUpdate?: Partial<OnboardingRecord>
  ): Promise<OnboardingRecord | null> {
    const update: Partial<OnboardingRecord> = {
      currentStage: stage,
      status,
      ...additionalUpdate
    };
    return this.update(employeeId, update);
  }

  async delete(employeeId: string): Promise<void> {
    await this.collection.deleteOne({ employeeId });
  }
}
