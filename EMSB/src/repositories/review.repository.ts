import type { Collection, Filter } from "mongodb";
import type { EmployeeReview, ReviewStatus } from "../models/review.js";
import { getCollection } from "../config/database.js";

export interface ReviewListFilters {
  employeeId?: string;
  reviewerId?: string;
  status?: ReviewStatus;
  reviewPeriod?: string;
  page?: number;
  pageSize?: number;
}

export class ReviewRepository {
  private get collection(): Collection<EmployeeReview> {
    return getCollection<EmployeeReview>("employee_reviews");
  }

  async findById(reviewId: string): Promise<EmployeeReview | null> {
    return this.collection.findOne({ reviewId });
  }

  async findMany(
    filters: ReviewListFilters
  ): Promise<{ reviews: EmployeeReview[]; total: number }> {
    const { page = 1, pageSize = 20, ...queryFilters } = filters;
    const query: Filter<EmployeeReview> = {};

    if (queryFilters.employeeId) {
      query.employeeId = queryFilters.employeeId;
    }
    if (queryFilters.reviewerId) {
      query.reviewerId = queryFilters.reviewerId;
    }
    if (queryFilters.status) {
      query.status = queryFilters.status;
    }
    if (queryFilters.reviewPeriod) {
      query.reviewPeriod = queryFilters.reviewPeriod;
    }

    const skip = (page - 1) * pageSize;

    const [reviews, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.collection.countDocuments(query)
    ]);

    return { reviews, total };
  }

  async create(review: Omit<EmployeeReview, "_id">): Promise<EmployeeReview> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...review,
      _id: new ObjectId()
    });
    return { ...review, _id: result.insertedId };
  }

  async update(
    reviewId: string,
    update: Partial<EmployeeReview>
  ): Promise<EmployeeReview | null> {
    await this.collection.updateOne(
      { reviewId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(reviewId);
  }
}
