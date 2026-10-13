import type { Collection } from "mongodb";
import type { Project } from "../models/project.js";
import { getCollection } from "../config/database.js";

export class ProjectRepository {
  private get collection(): Collection<Project> {
    return getCollection<Project>("projects");
  }

  async findById(projectId: string): Promise<Project | null> {
    return this.collection.findOne({ projectId });
  }

  async findByCode(code: string): Promise<Project | null> {
    return this.collection.findOne({ code });
  }

  async findMany(
    filters: { status?: string; clientId?: string; managerId?: string; page?: number; pageSize?: number }
  ): Promise<{ projects: Project[]; total: number }> {
    const { page = 1, pageSize = 20, ...queryFilters } = filters;

    const query: Record<string, unknown> = {};

    if (queryFilters.status) {
      query.status = queryFilters.status;
    }
    if (queryFilters.clientId) {
      query.clientId = queryFilters.clientId;
    }
    if (queryFilters.managerId) {
      query.managerId = queryFilters.managerId;
    }

    const skip = (page - 1) * pageSize;

    const [projects, total] = await Promise.all([
      this.collection.find(query).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(query)
    ]);

    return { projects, total };
  }

  async create(project: Omit<Project, "_id">): Promise<Project> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...project,
      _id: new ObjectId()
    });
    return { ...project, _id: result.insertedId };
  }

  async update(projectId: string, update: Partial<Project>): Promise<Project | null> {
    await this.collection.updateOne(
      { projectId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(projectId);
  }

  async setStatus(projectId: string, status: Project["status"]): Promise<Project | null> {
    await this.collection.updateOne(
      { projectId },
      { $set: { status, updatedAt: new Date() } }
    );
    return this.findById(projectId);
  }
}
