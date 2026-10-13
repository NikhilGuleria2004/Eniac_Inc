import type { Collection, Filter } from "mongodb";
import type { ProjectAssignment, AssignmentStatus } from "../models/assignment.js";
import { getCollection } from "../config/database.js";

export interface AssignmentListFilters {
  employeeId?: string;
  projectId?: string;
  status?: AssignmentStatus;
  page?: number;
  pageSize?: number;
}

export class AssignmentRepository {
  private get collection(): Collection<ProjectAssignment> {
    return getCollection<ProjectAssignment>("project_assignments");
  }

  async findById(assignmentId: string): Promise<ProjectAssignment | null> {
    return this.collection.findOne({ assignmentId });
  }

  async findMany(
    filters: AssignmentListFilters
  ): Promise<{ assignments: ProjectAssignment[]; total: number }> {
    const { page = 1, pageSize = 20, ...queryFilters } = filters;
    const query: Filter<ProjectAssignment> = {};

    if (queryFilters.employeeId) {
      query.employeeId = queryFilters.employeeId;
    }
    if (queryFilters.projectId) {
      query.projectId = queryFilters.projectId;
    }
    if (queryFilters.status) {
      query.status = queryFilters.status;
    }

    const skip = (page - 1) * pageSize;

    const [assignments, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.collection.countDocuments(query)
    ]);

    return { assignments, total };
  }

  async findActiveByEmployee(employeeId: string): Promise<ProjectAssignment[]> {
    return this.collection.find({ employeeId, status: "ACTIVE" }).toArray();
  }

  async findActiveByProject(projectId: string): Promise<ProjectAssignment[]> {
    return this.collection.find({ projectId, status: "ACTIVE" }).toArray();
  }

  async sumActiveAllocationByEmployee(employeeId: string): Promise<number> {
    const result = await this.collection
      .aggregate([
        { $match: { employeeId, status: "ACTIVE" } },
        { $group: { _id: null, total: { $sum: "$allocationPercent" } } }
      ])
      .toArray();
    return result.length > 0 ? (result[0].total as number) : 0;
  }

  async create(assignment: Omit<ProjectAssignment, "_id">): Promise<ProjectAssignment> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...assignment,
      _id: new ObjectId()
    });
    return { ...assignment, _id: result.insertedId };
  }

  async update(
    assignmentId: string,
    update: Partial<ProjectAssignment>
  ): Promise<ProjectAssignment | null> {
    await this.collection.updateOne(
      { assignmentId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(assignmentId);
  }

  async setStatus(
    assignmentId: string,
    status: AssignmentStatus
  ): Promise<ProjectAssignment | null> {
    await this.collection.updateOne(
      { assignmentId },
      { $set: { status, updatedAt: new Date() } }
    );
    return this.findById(assignmentId);
  }
}
