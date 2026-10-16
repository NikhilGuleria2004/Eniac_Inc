import { useUrlState } from "../../lib/useUrlState";
import { useParams, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { ArrowLeft, User, Calendar, CheckCircle, UserCheck, Save } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { StatusBadge } from "../../components/data/StatusBadge";
import { getReviewById, getEmployees, updateReview } from "../../data/mock/repositories";
import { getReviewEmployee, getReviewReviewer, ratingToLabel } from "./reviews";
import { useAuth } from "../../features/auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { useToast } from "../../components/ui/Toast";

export function ReviewDetailPage() {
  const [tab, setTab] = useUrlState("tab", "overview");

  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const review = useMemo(() => getReviewById(reviewId!), [reviewId]);
  const allEmployees = useMemo(() => getEmployees(), []);

  const employee = useMemo(() => review ? getReviewEmployee(review) : undefined, [review, allEmployees]);
  const reviewer = useMemo(() => review ? getReviewReviewer(review) : undefined, [review, allEmployees]);
  const canAcknowledge = useMemo(() => user && review && (review.status === "COMPLETED") && hasPermission(user.role, "review.manage"), [user, review]);

  const handleBack = () => navigate(-1);
  const handleAcknowledge = () => {
    if (review) {
      updateReview(review.id, { status: "ACKNOWLEDGED", acknowledgedAt: new Date().toISOString() });
      addToast("success", "Review acknowledged");
      navigate(0);
    }
  };

  if (!review) {
    return (
      <div className="page-container">
        <h1 className="text-xl font-semibold text-gray-900">Review not found</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={handleBack} aria-label="Go back" className="p-2 hover:bg-gray-100 rounded-md text-gray-500">
          <ArrowLeft aria-hidden="true" size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Review #{review.id}</h1>
          <p className="text-sm text-gray-500">{review.reviewPeriod} performance review</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
          <User aria-hidden="true" size={14} className="text-gray-500" />
          <span className="text-sm text-gray-600">
            {employee ? `${employee.firstName} ${employee.lastName}` : review.employeeId}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
          <UserCheck aria-hidden="true" size={14} className="text-gray-500" />
          <span className="text-sm text-gray-600">
            Review by {reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : review.reviewerId}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
          <Calendar aria-hidden="true" size={14} className="text-gray-500" />
          <span className="text-sm text-gray-600">
            {new Date(review.reviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <StatusBadge status={review.status} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card space-y-6">
              <h3 className="text-sm font-semibold text-gray-900">Rating</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <CheckCircle
                        key={star}
                        size={20}
                        className={star <= review.rating ? "text-yellow-400 fill-current" : "text-gray-300"}
                      />
                    ))}
                  </div>
                  <span className="text-2xl font-semibold text-gray-900">{review.rating}/5</span>
                  <span className="text-sm text-gray-500">({ratingToLabel(review.rating)})</span>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Review Status</h3>
                <div className="flex items-center gap-4">
                  <StatusBadge status={review.status} />
                  <span className="text-sm text-gray-600">
                    {review.status === "COMPLETED" && !review.acknowledgedAt
                      ? "Waiting for employee acknowledgement"
                      : review.status === "COMPLETED"
                      ? "Acknowledged by employee"
                      : review.status === "SCHEDULED"
                      ? "Review scheduled, not yet started"
                      : review.status === "IN_PROGRESS"
                      ? "Review in progress"
                      : "Review has been acknowledged"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Review Details</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Review Period</dt>
                    <dd className="font-medium text-gray-900">{review.reviewPeriod}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Review Date</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(review.reviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Employee</dt>
                    <dd className="font-medium text-gray-900">
                      {employee ? `${employee.firstName} ${employee.lastName}` : review.employeeId}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Reviewer</dt>
                    <dd className="font-medium text-gray-900">
                      {reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : review.reviewerId}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Status</dt>
                    <dd><StatusBadge status={review.status} /></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Rating</dt>
                    <dd className="font-medium text-gray-900">{review.rating}/5 — {ratingToLabel(review.rating)}</dd>
                  </div>
                </dl>
              </div>

              {canAcknowledge && (
                <button
                  onClick={handleAcknowledge}
                  className="btn btn-primary w-full"
                >
                  <Save aria-hidden="true" size={16} className="mr-2" />
                  Acknowledge Review
                </button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Performance Feedback</h3>
            <div className="page-container space-y-6">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Strengths</h4>
                <p className="text-sm text-gray-700">{review.strengths || "No strengths documented."}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Improvement Areas</h4>
                <p className="text-sm text-gray-700">{review.improvementAreas || "No improvement areas documented."}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Goals</h4>
                <p className="text-sm text-gray-700">{review.goals || "No goals set."}</p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Reviewer Comments</h4>
                <p className="text-sm text-gray-700">{review.comments || "No additional comments."}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Review Timeline</h3>
            <div className="space-y-4">
              <div className="border-l-2 border-accent pl-4 pb-2">
                <p className="text-sm font-medium text-gray-900">Review created</p>
                <p className="text-xs text-gray-500">Scheduled by {reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : review.reviewerId} on {new Date(review.reviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <div className="border-l-2 border-gray-300 pl-4 pb-2">
                <p className="text-sm font-medium text-gray-900">Status: {review.status}</p>
                <p className="text-xs text-gray-500">Review status updated to {review.status}</p>
              </div>
              {review.status === "COMPLETED" && (
                <div className="border-l-2 border-green-500 pl-4 pb-2">
                  <p className="text-sm font-medium text-gray-900">Review completed</p>
                  <p className="text-xs text-gray-500">Employee performance review finalized with rating {review.rating}/5</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <button onClick={handleBack} className="btn btn-secondary">
          <ArrowLeft aria-hidden="true" size={16} className="mr-2" />
          Back to Reviews
        </button>
      </div>
    </div>
  );
}
