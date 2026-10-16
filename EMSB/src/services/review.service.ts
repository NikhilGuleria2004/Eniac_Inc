import { ReviewRepository } from "../repositories/review.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import type { EmployeeReview, ReviewStatus } from "../models/review.js";
import type { Role } from "../config/constants.js";
import { NotFoundError, BusinessRuleError } from "../utils/errors.js";
import { toISO, formatDateOnly } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import type {
  CreateReviewInput,
  UpdateReviewInput,
  ReviewListQuery
} from "../schemas/review.schemas.js";

export interface ReviewDTO {
  id: string;
  reviewId: string;
  employeeId: string;
  reviewerId: string;
  reviewPeriod: string;
  rating: number;
  strengths: string;
  improvementAreas: string;
  goals: string;
  comments: string;
  status: ReviewStatus;
  reviewDate: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const VALID_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  SCHEDULED: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["ACKNOWLEDGED"],
  ACKNOWLEDGED: []
};

export class ReviewService {
  constructor(
    private reviewRepository: ReviewRepository,
    private employeeRepository: EmployeeRepository
  ) {}

  async listReviews(
    filters: ReviewListQuery,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<{ reviews: ReviewDTO[]; total: number; page: number; pageSize: number }> {
    if (actorRole === "EMPLOYEE") {
      if (!requestingEmployeeId) {
        return { reviews: [], total: 0, page: filters.page, pageSize: filters.pageSize };
      }
      const { reviews, total } = await this.reviewRepository.findMany({
        ...filters,
        employeeId: requestingEmployeeId
      });
      return {
        reviews: reviews.map((r) => this.toDTO(r)),
        total,
        page: filters.page,
        pageSize: filters.pageSize
      };
    }

    const { reviews, total } = await this.reviewRepository.findMany(filters);
    return {
      reviews: reviews.map((r) => this.toDTO(r)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async createReview(input: CreateReviewInput, actorRole: Role, actorUserId: string): Promise<ReviewDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(input.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const reviewer = await this.employeeRepository.findByEmployeeId(input.reviewerId);
    if (!reviewer) {
      throw new NotFoundError("Reviewer was not found.");
    }

    const reviewId = await this.generateReviewId();

    const review: Omit<EmployeeReview, "_id"> = {
      reviewId,
      employeeId: input.employeeId,
      reviewerId: input.reviewerId,
      reviewPeriod: input.reviewPeriod,
      rating: input.rating,
      strengths: input.strengths,
      improvementAreas: input.improvementAreas,
      goals: input.goals,
      comments: input.comments,
      status: "SCHEDULED",
      reviewDate: input.reviewDate,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.reviewRepository.create(review);
    await writeAuditLog(actorRole, "review.created", "review", created.reviewId, actorUserId);

    return this.toDTO(created);
  }

  async getReviewById(
    reviewId: string,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<ReviewDTO> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review was not found.");
    }

    if (actorRole === "EMPLOYEE" && review.employeeId !== requestingEmployeeId) {
      throw new NotFoundError("Review was not found.");
    }

    return this.toDTO(review);
  }

  async updateReview(
    reviewId: string,
    input: UpdateReviewInput,
    actorRole: Role,
    actorUserId: string
  ): Promise<ReviewDTO> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review was not found.");
    }

    if (input.status !== undefined && input.status !== review.status) {
      this.assertValidTransition(review.status, input.status);
    }

    const update: Partial<EmployeeReview> = {};
    if (input.rating !== undefined) update.rating = input.rating;
    if (input.strengths !== undefined) update.strengths = input.strengths;
    if (input.improvementAreas !== undefined) update.improvementAreas = input.improvementAreas;
    if (input.goals !== undefined) update.goals = input.goals;
    if (input.comments !== undefined) update.comments = input.comments;
    if (input.reviewDate !== undefined) update.reviewDate = input.reviewDate;
    if (input.status !== undefined) {
      update.status = input.status;
      if (input.status === "ACKNOWLEDGED") {
        update.acknowledgedAt = new Date();
      }
    }

    const updated = await this.reviewRepository.update(reviewId, update);
    if (!updated) {
      throw new NotFoundError("Review was not found.");
    }

    await writeAuditLog(actorRole, "review.updated", "review", reviewId, actorUserId);

    return this.toDTO(updated);
  }

  async submitReview(reviewId: string, actorRole: Role, actorUserId: string): Promise<ReviewDTO> {
    return this.transition(reviewId, "IN_PROGRESS", actorRole, actorUserId);
  }

  async completeReview(reviewId: string, actorRole: Role, actorUserId: string): Promise<ReviewDTO> {
    return this.transition(reviewId, "COMPLETED", actorRole, actorUserId);
  }

  private async transition(
    reviewId: string,
    targetStatus: ReviewStatus,
    actorRole: Role,
    actorUserId: string
  ): Promise<ReviewDTO> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundError("Review was not found.");
    }

    this.assertValidTransition(review.status, targetStatus);

    const updated = await this.reviewRepository.update(reviewId, { status: targetStatus });
    if (!updated) {
      throw new NotFoundError("Review was not found.");
    }

    const actionMap: Record<ReviewStatus, string> = {
      SCHEDULED: "review.updated",
      IN_PROGRESS: "review.submitted",
      COMPLETED: "review.completed",
      ACKNOWLEDGED: "review.acknowledged"
    };

    await writeAuditLog(actorRole, actionMap[targetStatus], "review", reviewId, actorUserId);

    return this.toDTO(updated);
  }

  private assertValidTransition(from: ReviewStatus, to: ReviewStatus): void {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BusinessRuleError(
        `Invalid review status transition from ${from} to ${to}`,
        "INVALID_REVIEW_TRANSITION"
      );
    }
  }

  private toDTO(review: EmployeeReview): ReviewDTO {
    return {
      id: review.reviewId,
      reviewId: review.reviewId,
      employeeId: review.employeeId,
      reviewerId: review.reviewerId,
      reviewPeriod: review.reviewPeriod,
      rating: review.rating ?? 0,
      strengths: review.strengths ?? "",
      improvementAreas: review.improvementAreas ?? "",
      goals: review.goals ?? "",
      comments: review.comments ?? "",
      status: review.status,
      reviewDate: formatDateOnly(review.reviewDate) ?? "",
      acknowledgedAt: toISO(review.acknowledgedAt),
      createdAt: toISO(review.createdAt) ?? "",
      updatedAt: toISO(review.updatedAt) ?? ""
    };
  }

  private async generateReviewId(): Promise<string> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const maxDoc = await db.collection("employee_reviews")
      .findOne({}, { sort: { reviewId: -1 }, projection: { reviewId: 1 } });

    let nextNum = 1;
    if (maxDoc?.reviewId) {
      const match = maxDoc.reviewId.match(/REV-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `REV-${String(nextNum).padStart(4, "0")}`;
  }
}
