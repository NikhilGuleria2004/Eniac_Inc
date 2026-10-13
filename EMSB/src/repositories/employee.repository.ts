import type { Collection, Filter } from "mongodb";
import type { Employee } from "../models/employee.js";
import { getCollection } from "../config/database.js";
import { escapeRegex } from "../utils/validation.js";
import type {
  EmploymentStatus,
  BillingStatus
} from "../config/constants.js";

export interface EmployeeListFilters {
  search?: string;
  employmentStatus?: EmploymentStatus;
  billingStatus?: BillingStatus;
  department?: string;
  country?: string;
  managerId?: string;
  designation?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export class EmployeeRepository {
  private get collection(): Collection<Employee> {
    return getCollection<Employee>("employees");
  }

  async findById(employeeId: string): Promise<Employee | null> {
    return this.collection.findOne({ employeeId });
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.collection.findOne({ email });
  }

  async findByEmployeeId(employeeId: string): Promise<Employee | null> {
    return this.collection.findOne({ employeeId });
  }

  async findMany(
    filters: EmployeeListFilters
  ): Promise<{ employees: Employee[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = "employeeId",
      sortOrder = "asc",
      ...queryFilters
    } = filters;

    const query: Filter<Employee> = {};

    if (queryFilters.search) {
      const searchRegex = { $regex: escapeRegex(queryFilters.search), $options: "i" };
      query.$or = [
        { employeeId: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { designation: searchRegex },
        { department: searchRegex }
      ];
    }

    if (queryFilters.employmentStatus) {
      query.employmentStatus = queryFilters.employmentStatus;
    }
    if (queryFilters.billingStatus) {
      query.billingStatus = queryFilters.billingStatus;
    }
    if (queryFilters.department) {
      query.department = queryFilters.department;
    }
    if (queryFilters.country) {
      query.country = queryFilters.country;
    }
    if (queryFilters.managerId) {
      query.managerId = queryFilters.managerId;
    }
    if (queryFilters.designation) {
      query.designation = queryFilters.designation;
    }

    const skip = (page - 1) * pageSize;
    const sortField = ["employeeId", "firstName", "lastName", "department", "joiningDate", "createdAt"].includes(sortBy)
      ? sortBy
      : "employeeId";

    const [employees, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.collection.countDocuments(query)
    ]);

    return { employees, total };
  }

  async create(employee: Omit<Employee, "_id">): Promise<Employee> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...employee,
      _id: new ObjectId()
    });
    return { ...employee, _id: result.insertedId };
  }

  async update(employeeId: string, update: Partial<Employee>): Promise<Employee | null> {
    await this.collection.updateOne(
      { employeeId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(employeeId);
  }

  async updateEmploymentStatus(
    employeeId: string,
    employmentStatus: EmploymentStatus
  ): Promise<Employee | null> {
    await this.collection.updateOne(
      { employeeId },
      { $set: { employmentStatus, updatedAt: new Date() } }
    );
    return this.findById(employeeId);
  }

  async updateBillingStatus(
    employeeId: string,
    billingStatus: BillingStatus
  ): Promise<Employee | null> {
    await this.collection.updateOne(
      { employeeId },
      { $set: { billingStatus, updatedAt: new Date() } }
    );
    return this.findById(employeeId);
  }

  async delete(employeeId: string): Promise<void> {
    await this.collection.deleteOne({ employeeId });
  }
}
