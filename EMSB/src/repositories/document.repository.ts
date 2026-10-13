import type { Collection, Filter } from "mongodb";
import type { EmployeeDocument, DocumentStatus } from "../models/document.js";
import { getCollection } from "../config/database.js";
import { escapeRegex } from "../utils/validation.js";

export interface DocumentListFilters {
  type?: string;
  status?: DocumentStatus;
  employeeId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class DocumentRepository {
  private get collection(): Collection<EmployeeDocument> {
    return getCollection<EmployeeDocument>("documents");
  }

  async findById(documentId: string): Promise<EmployeeDocument | null> {
    return this.collection.findOne({ documentId });
  }

  async findMany(
    filters: DocumentListFilters
  ): Promise<{ documents: EmployeeDocument[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      ...queryFilters
    } = filters;

    const query: Filter<EmployeeDocument> = {};

    if (queryFilters.type) {
      query.type = queryFilters.type;
    }
    if (queryFilters.status) {
      query.status = queryFilters.status;
    }
    if (queryFilters.employeeId) {
      query.employeeId = queryFilters.employeeId;
    }
    if (queryFilters.search) {
      const searchRegex = { $regex: escapeRegex(queryFilters.search), $options: "i" };
      query.$or = [
        { documentId: searchRegex },
        { name: searchRegex },
        { type: searchRegex }
      ];
    }

    const skip = (page - 1) * pageSize;

    const [documents, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.collection.countDocuments(query)
    ]);

    return { documents, total };
  }

  async findByEmployeeId(employeeId: string): Promise<EmployeeDocument[]> {
    return this.collection
      .find({ employeeId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async create(document: Omit<EmployeeDocument, "_id">): Promise<EmployeeDocument> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...document,
      _id: new ObjectId()
    });
    return { ...document, _id: result.insertedId };
  }

  async update(
    documentId: string,
    update: Partial<EmployeeDocument>
  ): Promise<EmployeeDocument | null> {
    await this.collection.updateOne(
      { documentId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(documentId);
  }

  async updateStatus(
    documentId: string,
    status: DocumentStatus,
    additionalUpdate?: Partial<EmployeeDocument>
  ): Promise<EmployeeDocument | null> {
    const update: Partial<EmployeeDocument> = {
      status,
      ...additionalUpdate
    };
    return this.update(documentId, update);
  }

  async getExpiringSoon(expiryDays: number): Promise<EmployeeDocument[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + expiryDays);

    return this.collection
      .find({
        expiresAt: {
          $lte: future,
          $gt: now
        },
        status: "APPROVED"
      })
      .toArray();
  }

  async getExpired(): Promise<EmployeeDocument[]> {
    return this.collection
      .find({
        expiresAt: { $lte: new Date() },
        status: "APPROVED"
      })
      .toArray();
  }

  async delete(documentId: string): Promise<void> {
    await this.collection.deleteOne({ documentId });
  }
}
