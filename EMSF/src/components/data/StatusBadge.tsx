interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusVariants: Record<string, string> = {
  ACTIVE: "badge-success",
  INACTIVE: "badge-neutral",
  ONBOARDING: "badge-info",
  ON_LEAVE: "badge-warning",
  TERMINATED: "badge-danger",
  PLANNING: "badge-info",
  ON_HOLD: "badge-warning",
  COMPLETED: "badge-success",
  CANCELLED: "badge-danger",
  PENDING: "badge-warning",
  UNDER_REVIEW: "badge-info",
  APPROVED: "badge-success",
  REJECTED: "badge-danger",
  EXPIRED: "badge-danger",
  EXPIRING_SOON: "badge-warning",
  ON_TRACK: "badge-success",
  AT_RISK: "badge-warning",
  DELAYED: "badge-danger",
  PROVISIONED: "badge-success",
  ELIGIBLE: "badge-success",
  NOT_ELIGIBLE: "badge-neutral",
  PENDING_PROVISIONING: "badge-warning",
  PROVISIONING_FAILED: "badge-danger",
  PRESENT: "badge-success",
  ABSENT: "badge-danger",
  LATE: "badge-warning",
  LEAVE: "badge-info",
  MISSING: "badge-danger",
  BILLABLE: "badge-success",
  NON_BILLABLE: "badge-neutral",
  SCHEDULED: "badge-info",
  IN_PROGRESS: "badge-warning",
  ACKNOWLEDGED: "badge-success",
  PROSPECT: "badge-info",
  SUSPENDED: "badge-warning",
  CLOSED: "badge-neutral",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const variant = statusVariants[status] || "badge-neutral";

  return (
    <span className={`badge ${variant} ${className}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
