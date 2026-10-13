import type { Collection } from "mongodb";
import type { Client } from "../models/client.js";
import { getCollection } from "../config/database.js";
import { escapeRegex } from "../utils/validation.js";

export class ClientRepository {
  private get collection(): Collection<Client> {
    return getCollection<Client>("clients");
  }

  async findById(clientId: string): Promise<Client | null> {
    return this.collection.findOne({ clientId });
  }

  async findByCode(code: string): Promise<Client | null> {
    return this.collection.findOne({ code });
  }

  async findMany(
    filters: { status?: string; industry?: string; search?: string; page?: number; pageSize?: number }
  ): Promise<{ clients: Client[]; total: number }> {
    const { page = 1, pageSize = 20, ...queryFilters } = filters;

    const query: Record<string, unknown> = {};

    if (queryFilters.status) {
      query.status = queryFilters.status;
    }
    if (queryFilters.industry) {
      query.industry = queryFilters.industry;
    }
    if (queryFilters.search) {
      query.$or = [
        { name: { $regex: escapeRegex(queryFilters.search), $options: "i" } },
        { code: { $regex: escapeRegex(queryFilters.search), $options: "i" } }
      ];
    }

    const skip = (page - 1) * pageSize;

    const [clients, total] = await Promise.all([
      this.collection.find(query).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(query)
    ]);

    return { clients, total };
  }

  async create(client: Omit<Client, "_id">): Promise<Client> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...client,
      _id: new ObjectId()
    });
    return { ...client, _id: result.insertedId };
  }

  async update(clientId: string, update: Partial<Client>): Promise<Client | null> {
    await this.collection.updateOne(
      { clientId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(clientId);
  }

  async deactivate(clientId: string): Promise<Client | null> {
    await this.collection.updateOne(
      { clientId },
      { $set: { status: "INACTIVE", updatedAt: new Date() } }
    );
    return this.findById(clientId);
  }
}
