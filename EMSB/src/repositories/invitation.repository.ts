import type { Collection, Filter } from "mongodb";
import type { Invitation, InvitationStatus } from "../models/invitation.js";
import { getCollection } from "../config/database.js";

export class InvitationRepository {
  private get collection(): Collection<Invitation> {
    return getCollection<Invitation>("invitations");
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return this.collection.findOne({ tokenHash });
  }

  async findByEmployeeId(employeeId: string): Promise<Invitation[]> {
    return this.collection
      .find({ employeeId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async findPendingByEmployeeId(employeeId: string): Promise<Invitation | null> {
    return this.collection.findOne({ employeeId, status: "PENDING" });
  }

  async create(record: Omit<Invitation, "_id">): Promise<Invitation> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...record,
      _id: new ObjectId()
    });
    return { ...record, _id: result.insertedId };
  }

  async updateStatus(
    tokenHash: string,
    status: InvitationStatus,
    additionalUpdate?: Partial<Invitation>
  ): Promise<Invitation | null> {
    await this.collection.updateOne(
      { tokenHash },
      { $set: { status, ...additionalUpdate, updatedAt: new Date() } }
    );
    return this.findByTokenHash(tokenHash);
  }

  async revokePendingForEmployee(employeeId: string): Promise<number> {
    const result = await this.collection.updateMany(
      { employeeId, status: "PENDING" },
      { $set: { status: "REVOKED", updatedAt: new Date() } }
    );
    return result.modifiedCount;
  }

  async deleteByEmployeeId(employeeId: string): Promise<void> {
    const query: Filter<Invitation> = { employeeId };
    await this.collection.deleteMany(query);
  }
}
