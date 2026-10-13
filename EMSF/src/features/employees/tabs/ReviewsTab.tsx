import type { Employee } from "../../../types";
import { getReviewsByEmployee, getEmployees } from "../../../data/mock/repositories";
import { StatusBadge } from "../../../components/data/StatusBadge";

export function ReviewsTab({ employee }: { employee: Employee }) {
  const reviews = getReviewsByEmployee(employee.id);
  const staff = getEmployees();
  const nameOf = (id: string) => {
    const e = staff.find((s) => s.id === id);
    return e ? `${e.firstName} ${e.lastName}` : id;
  };
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Performance Reviews ({reviews.length})
      </h3>
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews on record.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border border-gray-100 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {r.reviewPeriod} — Rating {r.rating}/5
                </p>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-xs text-gray-500 mb-2">Reviewer: {nameOf(r.reviewerId)}</p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Strengths:</span> {r.strengths}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Improvement:</span> {r.improvementAreas}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Goals:</span> {r.goals}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
