import type { Collection } from "mongodb";
import type { TimesheetProvisioning, TimesheetProvisioningStatus } from "../models/timesheet.js";
import { getCollection } from "../config/database.js";

export class TimesheetRepository {
  private get collection(): Collection<TimesheetProvisioning> {
    return getCollection<TimesheetProvisioning>("timesheet_provisioning");
  }

  async findByEmployeeId(employeeId: string): Promise<TimesheetProvisioning | null> {
    return this.collection.findOne({ employeeId });
  }

  async create(
    record: Omit<TimesheetProvisioning, "_id">
  ): Promise<TimesheetProvisioning> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...record,
      _id: new ObjectId()
    });
    return { ...record, _id: result.insertedId };
  }

  async upsert(
    employeeId: string,
    update: Partial<TimesheetProvisioning>
  ): Promise<TimesheetProvisioning> {
    const now = new Date();
    await this.collection.updateOne(
      { employeeId },
      {
        $set: { ...update, updatedAt: now },
        $setOnInsert: { employeeId, createdAt: now }
      },
      { upsert: true }
    );
    const updated = await this.findByEmployeeId(employeeId);
    return updated!;
  }

  async updateStatus(
    employeeId: string,
    status: TimesheetProvisioningStatus,
    additionalUpdate?: Partial<TimesheetProvisioning>
  ): Promise<TimesheetProvisioning> {
    return this.upsert(employeeId, { status, ...additionalUpdate });
  }
}
