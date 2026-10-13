import type { Review, Employee } from "../../types";
import { getEmployees } from "../../data/mock/repositories";

export interface ReviewKPIs {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  acknowledged: number;
  avgRating: number;
}

export interface ReviewFilters {
  search: string;
  status: string;
  period: string;
}

export function computeReviewKPIs(reviews: Review[]): ReviewKPIs {
  const rated = reviews.filter((r) => r.rating > 0);
  const avgRating = rated.length > 0 ? Math.round((rated.reduce((sum, r) => sum + r.rating, 0) / rated.length) * 10) / 10 : 0;

  return {
    total: reviews.length,
    scheduled: reviews.filter((r) => r.status === "SCHEDULED").length,
    inProgress: reviews.filter((r) => r.status === "IN_PROGRESS").length,
    completed: reviews.filter((r) => r.status === "COMPLETED").length,
    acknowledged: reviews.filter((r) => r.status === "ACKNOWLEDGED").length,
    avgRating,
  };
}

export function filterReviews(reviews: Review[], filters: ReviewFilters): Review[] {
  return reviews.filter((review) => {
    const employees = getEmployees();
    const emp = employees.find((e) => e.id === review.employeeId);
    const reviewer = employees.find((e) => e.id === review.reviewerId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : "";
    const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}`.toLowerCase() : "";

    const matchesSearch =
      filters.search === "" ||
      empName.includes(filters.search.toLowerCase()) ||
      reviewerName.includes(filters.search.toLowerCase()) ||
      review.reviewPeriod.toLowerCase().includes(filters.search.toLowerCase()) ||
      review.strengths.toLowerCase().includes(filters.search.toLowerCase()) ||
      review.improvementAreas.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus = filters.status === "all" || review.status === filters.status;
    const matchesPeriod = filters.period === "all" || review.reviewPeriod === filters.period;

    return matchesSearch && matchesStatus && matchesPeriod;
  });
}

export function getUniqueReviewStatuses(): Review["status"][] {
  return ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "ACKNOWLEDGED"];
}

export function getUniqueReviewPeriods(reviews: Review[]): string[] {
  return [...new Set(reviews.map((r) => r.reviewPeriod))].sort();
}

export function getReviewEmployee(review: Review): Employee | undefined {
  const employees = getEmployees();
  return employees.find((e) => e.id === review.employeeId);
}

export function getReviewReviewer(review: Review): Employee | undefined {
  const employees = getEmployees();
  return employees.find((e) => e.id === review.reviewerId);
}

export function getEmployeeName(id: string): string {
  const employees = getEmployees();
  const emp = employees.find((e) => e.id === id);
  return emp ? `${emp.firstName} ${emp.lastName}` : id;
}

export function ratingToLabel(rating: number): string {
  const labels: Record<number, string> = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very Good",
    5: "Excellent",
  };
  return labels[rating] ?? "Unrated";
}

export interface RatingOption {
  value: number;
  label: string;
}

export const RATING_OPTIONS: RatingOption[] = [
  { value: 1, label: "1 - Poor" },
  { value: 2, label: "2 - Fair" },
  { value: 3, label: "3 - Good" },
  { value: 4, label: "4 - Very Good" },
  { value: 5, label: "5 - Excellent" },
];

export function getStatusColor(status: Review["status"]): string {
  const colors: Record<Review["status"], string> = {
    SCHEDULED: "badge-info",
    IN_PROGRESS: "badge-warning",
    COMPLETED: "badge-success",
    ACKNOWLEDGED: "badge-neutral",
  };
  return colors[status];
}
