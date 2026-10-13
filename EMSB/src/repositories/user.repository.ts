import type { Collection, ObjectId } from "mongodb";
import { getCollection } from "../config/database.js";

export interface UserDocument {
  _id: ObjectId;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  hashedPassword?: string;
  employeeId?: string;
  workMail?: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  private get collection(): Collection<UserDocument> {
    return getCollection<UserDocument>("users");
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.collection.findOne({ email });
  }

  async findByEmailOrWorkMail(emailOrWorkMail: string): Promise<UserDocument | null> {
    return this.collection.findOne({
      $or: [{ email: emailOrWorkMail }, { workMail: emailOrWorkMail }]
    });
  }

  async findByUserId(userId: string): Promise<UserDocument | null> {
    return this.collection.findOne({ userId });
  }

  async findByEmployeeId(employeeId: string): Promise<UserDocument | null> {
    return this.collection.findOne({ employeeId });
  }

  /**
   * Batch lookup of the users linked to the given employees. Only the fields
   * needed for role attribution are projected — keeps list views free of N+1
   * queries and avoids pulling hashed passwords.
   */
  async findByEmployeeIds(employeeIds: string[]): Promise<UserDocument[]> {
    if (employeeIds.length === 0) return [];
    return this.collection
      .find({ employeeId: { $in: employeeIds } }, { projection: { employeeId: 1, role: 1 } })
      .toArray();
  }

  async findByRole(role: string): Promise<UserDocument[]> {
    return this.collection.find({ role, status: "ACTIVE" }).toArray();
  }

  async findById(userId: string): Promise<UserDocument | null> {
    const { ObjectId } = await import("mongodb");
    return this.collection.findOne({ _id: new ObjectId(userId) });
  }

  async create(user: Omit<UserDocument, "_id">): Promise<UserDocument> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...user,
      _id: new ObjectId()
    });
    return { ...user, _id: result.insertedId };
  }

  async setPasswordAndActivate(userId: string, hashedPassword: string): Promise<void> {
    await this.collection.updateOne(
      { userId },
      { $set: { hashedPassword, status: "ACTIVE", updatedAt: new Date() } }
    );
  }
}
