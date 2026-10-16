import { useNavigate } from "react-router-dom";
import { CheckCircle, Clock, ExternalLink, FileText } from "lucide-react";
import type { Employee } from "../../../types";
import { useAuth } from "../../auth/AuthContext";
import { hasPermission } from "../../../lib/permissions";
import { getDocumentsByEmployee } from "../../../data/mock/repositories";
import { ROUTES } from "../../../data/constants";

interface Step8TimesheetEligibilityProps {
  employee: Employee;
}

export function Step8TimesheetEligibility({ employee }: Step8TimesheetEligibilityProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const canViewDocs = hasPermission(role, "document.view");

  const eligibility = employee.timesheetEligibility ?? "NOT_ELIGIBLE";
  const isBillable = employee.billingStatus === "BILLABLE";
  const isProvisioned = eligibility === "PROVISIONED" || eligibility === "ELIGIBLE";

  const documents = getDocumentsByEmployee(employee.id);
  const offerLetter = documents.find((d) => d.type === "OFFER_LETTER" && d.status === "APPROVED");

  const provisioningDate = employee.updatedAt
    ? new Date(employee.updatedAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

  const handleDone = () => {
    navigate(ROUTES.ONBOARDING);
  };

  const handleDownloadOfferLetter = () => {
    if (offerLetter?.documentUrl) {
      window.open(offerLetter.documentUrl, "_blank");
    } else {
      alert("No signed offer letter found. The document will be available after Zoho Sign completion.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Provisioning Status</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Billing Status:</span>
            <span className="text-gray-900">{employee.billingStatus.replace(/_/g, " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Timesheet Eligibility:</span>
            <span className="text-gray-900">{eligibility.replace(/_/g, " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Provisioning Date:</span>
            <span className="text-gray-900">{provisioningDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Provisioned:</span>
            <span className="text-gray-900">
              {isProvisioned ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      {isBillable && isProvisioned && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <CheckCircle aria-hidden="true" size={18} className="text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">ELIGIBLE — provisioned to timesheet platform</p>
              <p className="text-sm text-green-800 mt-1">
                This employee is billable and has been provisioned to the timesheet platform.
                All billable hours will be tracked and invoiced to the client.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isBillable && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <Clock aria-hidden="true" size={18} className="text-gray-500 mt-0.5" />
            <div>
              <p className="font-medium text-gray-700">NOT ELIGIBLE — non-billable employee</p>
              <p className="text-sm text-gray-600 mt-1">
                This employee is classified as NON-BILLABLE. Timesheet entries are
                tracked locally but not sent to the client invoicing system.
              </p>
            </div>
          </div>
        </div>
      )}

      {eligibility === "PROVISIONING_FAILED" && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <CheckCircle aria-hidden="true" size={18} className="text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">PROVISIONING FAILED</p>
              <p className="text-sm text-red-800 mt-1">
                Timesheet platform provisioning encountered an error.
                Contact your system administrator to retry activation.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
        <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Available Actions
        </h5>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href={ROUTES.EMPLOYEE_DETAIL(employee.id) + "#timesheet"}
            className="btn btn-secondary text-sm"
          >
            <ExternalLink aria-hidden="true" size={14} /> View Timesheet Details
          </a>
          {offerLetter && canViewDocs && (
            <button
              type="button"
              onClick={handleDownloadOfferLetter}
              className="btn btn-secondary text-sm"
            >
              <FileText aria-hidden="true" size={14} /> Download Offer Letter
            </button>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleDone}
          className="btn btn-primary text-sm"
        >
          Done — Return to Onboarding Dashboard
        </button>
      </div>
    </div>
  );
}
