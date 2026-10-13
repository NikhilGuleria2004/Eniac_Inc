import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, Clock, FileText, Download, MoreVertical } from "lucide-react";
import { ROUTES } from "../../data/constants";
import { PageHeader } from "../../components/layout/PageHeader";
import { EmployeeCard } from "./components/EmployeeCard";
import { Stepper } from "./components/Stepper";
import { StepSection } from "./components/StepSection";
import { getEmployeeById } from "../../data/mock/repositories";
import { getDocumentsByEmployee } from "../../data/mock/repositories";
import { useToast } from "../../components/ui/Toast";
import {
  getOnboardingStepData,
  getOnboardingStage,
  type OnboardingStep,
} from "./onboarding";
import {
  Step1EmployeeInfo,
  Step2EmploymentDetails,
  Step3Geography,
  Step4BillingClassification,
} from "./components/StepEditors";
import { Step5Documents } from "./components/Step5Documents";
import { Step6HRReview } from "./components/Step6HRReview";
import { Step7Activation } from "./components/Step7Activation";
import { Step8TimesheetEligibility } from "./components/Step8TimesheetEligibility";
import { allRequiredDocumentsApproved, REQUIRED_DOCUMENT_TYPES } from "./documents";

export function OnboardingWizardPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();

  const contentRef = useRef<HTMLDivElement>(null);

  const employee = employeeId ? getEmployeeById(employeeId) : undefined;

  if (!employee) {
    return (
      <div className="page-container">
        <div className="card">
          <h1 className="text-lg font-semibold text-gray-900">
            Onboarding record not found
          </h1>
          <button
            type="button"
            onClick={() => navigate(ROUTES.ONBOARDING)}
            className="btn btn-secondary text-sm mt-4"
          >
            <ArrowLeft size={16} /> Back to Onboarding
          </button>
        </div>
      </div>
    );
  }

  const documents = getDocumentsByEmployee(employee.id);
  const steps = getOnboardingStepData(employee, documents);
  const currentStage = getOnboardingStage(steps);

  const activeStepIndex = steps.findIndex((s) => s.status !== "complete");
  const resolvedActiveIndex = activeStepIndex >= 0 ? activeStepIndex : steps.length - 1;
  const currentStep = steps[resolvedActiveIndex];

  const [activeIndex, setActiveIndex] = useState(resolvedActiveIndex);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [docRefreshKey, setDocRefreshKey] = useState(0);

  useEffect(() => {
    setActiveIndex(resolvedActiveIndex);
    setEditIndex(null);
  }, [resolvedActiveIndex, docRefreshKey]);

  useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        const section = document.querySelector('[data-step-primary="true"]') as HTMLButtonElement | null;
        if (section && !section.disabled) {
          section.click();
        }
      }
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        const activateBtn = document.querySelector('[data-step-activate="true"]') as HTMLButtonElement | null;
        if (activateBtn && !activateBtn.disabled) {
          activateBtn.click();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleStepClick = (index: number) => {
    if (steps[index].status === "complete" || steps[index].status === "current") {
      setEditIndex(null);
      setActiveIndex(index);
      const section = document.getElementById(`step-${index + 1}`);
      if (section) {
        const yOffset = -80;
        const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  };

  const handleScrollSpy = () => {
    if (!contentRef.current) return;
    const stepElements = steps.map((_, i) => document.getElementById(`step-${i + 1}`));
    const scrollPos = window.pageYOffset + 120;

    for (let i = stepElements.length - 1; i >= 0; i--) {
      const el = stepElements[i];
      if (el && el.offsetTop <= scrollPos) {
        setActiveIndex(i);
        break;
      }
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScrollSpy);
    return () => window.removeEventListener("scroll", handleScrollSpy);
  });

  const isStepEditable = (index: number): boolean => {
    const step = steps[index];
    if (step.status === "pending") return false;
    if (step.label === "Documents" || step.label === "HR Review" ||
        step.label === "Activation" || step.label === "Timesheet Eligibility") {
      return false;
    }
    return true;
  };

  const handleEditStep = (index: number) => {
    setEditIndex(index);
    setActiveIndex(index);
    const section = document.getElementById(`step-${index + 1}`);
    if (section) {
      const yOffset = -80;
      const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const renderStepContent = (step: OnboardingStep, index: number) => {
    const inEditMode = editIndex === index && isStepEditable(index);
    const showEdit = step.status === "complete" && isStepEditable(index);

    switch (step.label) {
      case "Employee Information":
        return inEditMode ? (
          <Step1EmployeeInfo employee={employee} onSaved={() => { setEditIndex(null); }} />
        ) : (
          <ReadOnlySummary
            fields={[
              { label: "Name", value: `${employee.firstName} ${employee.lastName}` },
              { label: "Email", value: employee.email },
              { label: "Phone", value: employee.phone ?? "—" },
            ]}
            onEdit={showEdit ? () => handleEditStep(index) : undefined}
          />
        );
      case "Employment Details":
        return inEditMode ? (
          <Step2EmploymentDetails employee={employee} onSaved={() => { setEditIndex(null); }} />
        ) : (
          <ReadOnlySummary
            fields={[
              { label: "Designation", value: employee.designation },
              { label: "Department", value: employee.department },
              { label: "Employment Type", value: employee.employmentType.replace(/_/g, " ") },
              { label: "Joining Date", value: employee.joiningDate },
              { label: "Manager", value: (() => {
                if (!employee.managerId) return "—";
                const mgr = getEmployeeById(employee.managerId);
                return mgr ? `${mgr.firstName} ${mgr.lastName}` : employee.managerId;
              })() },
            ]}
            onEdit={showEdit ? () => handleEditStep(index) : undefined}
          />
        );
      case "Geography":
        return inEditMode ? (
          <Step3Geography employee={employee} onSaved={() => { setEditIndex(null); }} />
        ) : (
          <ReadOnlySummary
            fields={[
              { label: "Country", value: employee.country },
              { label: "City", value: employee.city ?? "—" },
              { label: "State", value: employee.state ?? "—" },
            ]}
            onEdit={showEdit ? () => handleEditStep(index) : undefined}
          />
        );
      case "Billing Classification":
        return inEditMode ? (
          <Step4BillingClassification employee={employee} onSaved={() => { setEditIndex(null); }} />
        ) : (
          <div className="space-y-2">
            <ReadOnlySummary
              fields={[
                { label: "Billing Status", value: employee.billingStatus },
              ]}
              onEdit={showEdit ? () => handleEditStep(index) : undefined}
            />
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              {employee.billingStatus === "BILLABLE"
                ? "✅ BILLABLE — eligible for timesheet provisioning on activation."
                : "ℹ️ NON-BILLABLE — no automatic timesheet provisioning."}
            </div>
          </div>
        );
      case "Documents":
        return (
          <Step5Documents
            employee={employee}
            onDocReviewed={() => setDocRefreshKey((k) => k + 1)}
          />
        );
      case "HR Review":
        return (
          <Step6HRReview
            employee={employee}
            onApproved={() => setDocRefreshKey((k) => k + 1)}
            onRejected={() => setDocRefreshKey((k) => k + 1)}
          />
        );
      case "Activation":
        return (
          <Step7Activation
            employee={employee}
            onActivated={() => setDocRefreshKey((k) => k + 1)}
          />
        );
      case "Timesheet Eligibility":
        return <Step8TimesheetEligibility employee={employee} />;
      default:
        return <p className="text-sm text-gray-600">{step.detail}</p>;
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={employee.firstName + " " + employee.lastName}
        description={"Onboarding workflow — " + employee.employeeCode}
        breadcrumbs={[
          { label: "Onboarding", href: ROUTES.ONBOARDING },
          { label: employee.firstName + " " + employee.lastName },
        ]}
        actions={
          <button
            type="button"
            onClick={() => navigate(ROUTES.ONBOARDING)}
            className="btn btn-secondary text-sm"
          >
            <ArrowLeft size={16} /> Back to List
          </button>
        }
      />

      <EmployeeCard employee={employee} currentStage={currentStage} />

      <Stepper steps={steps} onStepClick={handleStepClick} />

      <div ref={contentRef} className="lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {steps.map((step, index) => (
            <StepSection
              key={step.key}
              step={step}
              index={index}
              isActive={index === activeIndex}
            >
              {renderStepContent(step, index)}
            </StepSection>
          ))}
        </div>
        <div className="lg:col-span-1">
          <ActionPanel
            steps={steps}
            currentStep={currentStep}
            activeIndex={activeIndex}
            docsAllApproved={allRequiredDocumentsApproved(documents)}
            documents={documents}
            employee={employee}
          />
        </div>
      </div>
    </div>
  );
}

interface ActionPanelProps {
  steps: OnboardingStep[];
  currentStep: OnboardingStep;
  activeIndex: number;
  docsAllApproved: boolean;
  documents: import("../../types").Document[];
  employee: import("../../types").Employee;
}

function ActionPanel({ steps, currentStep, activeIndex, docsAllApproved, documents, employee }: ActionPanelProps) {
  const isLast = activeIndex === steps.length - 1;
  const isComplete = currentStep.status === "complete";
  const isCurrent = currentStep.status === "current";

  let primaryLabel = "Continue";
  let primaryIcon: React.ReactNode = null;
  let primaryDisabled = false;

  if (isLast && isComplete) {
    primaryLabel = "Done";
    primaryIcon = <CheckCircle size={16} />;
  } else if (isCurrent) {
    if (currentStep.label === "Documents") {
      primaryLabel = "Mark as Complete";
      primaryDisabled = !docsAllApproved;
    } else if (currentStep.label === "HR Review") {
      primaryLabel = "Approve Onboarding";
      primaryIcon = <CheckCircle size={16} />;
    } else if (currentStep.label === "Activation") {
      primaryLabel = "Activate Employee";
      primaryIcon = <Send size={16} />;
    } else if (currentStep.label === "Timesheet Eligibility") {
      primaryLabel = "View Timesheet";
    } else {
      primaryLabel = "Continue";
    }
  } else {
    primaryDisabled = true;
  }

  return (
    <div className="lg:sticky lg:top-24 lg:h-fit">
      <div className="space-y-3">
        <div className="border-b border-gray-200 pb-2 mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Action Panel</p>
          <p className="text-sm font-medium text-gray-900">{currentStep.label}</p>
        </div>

        <button
          type="button"
          disabled={primaryDisabled}
          className="btn btn-primary text-sm w-full"
        >
          {primaryIcon}
          {primaryLabel}
        </button>

        <button type="button" className="btn btn-secondary text-sm w-full">
          {currentStep.label === "Documents" ? "Upload Document" : "View Details"}
        </button>

        {currentStep.label === "Documents" && (
          <button type="button" className="btn btn-secondary text-sm w-full">
            <FileText size={14} /> Bulk Upload
          </button>
        )}

        {currentStep.label === "Documents" && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <p className="text-xs text-gray-500">Required Documents</p>
            {documents.length > 0
              ? (() => {
                  const approved = documents.filter(
                    (d) => REQUIRED_DOCUMENT_TYPES.includes(d.type) && d.status === "APPROVED"
                  ).length;
                  return (
                    <>
                      <p className="text-sm text-gray-700 mt-1">
                        {approved}/4 approved
                      </p>
                      {docsAllApproved && (
                        <p className="text-xs text-green-700 mt-1">
                          All required documents approved — ready to mark complete.
                        </p>
                      )}
                      {!docsAllApproved && (
                        <p className="text-xs text-gray-500 mt-1">
                          Waiting for approvals from HR.
                        </p>
                      )}
                    </>
                  );
                })()
              : <p className="text-sm text-gray-500 mt-1">No documents uploaded yet.</p>}
          </div>
        )}

        <div className="border-t border-gray-200 pt-3 mt-3">
          <p className="text-xs text-gray-500">Status</p>
          <p className="text-sm text-gray-700">{currentStep.status.replace(/_/g, " ")}</p>
          <p className="text-xs text-gray-400 mt-1">
            Step {activeIndex + 1} of {steps.length}
          </p>
        </div>

        {currentStep.label === "Activation" && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock size={12} />
              <span>Activation triggers timesheet provisioning</span>
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
          <button
            type="button"
            className="btn btn-secondary text-sm w-full"
            onClick={() => {
              const csvRows = [
                "Field,Value",
                `Employee Code,${employee.employeeCode}`,
                `Name,${employee.firstName} ${employee.lastName}`,
                `Email,${employee.email}`,
                `Phone,${employee.phone}`,
                `Designation,${employee.designation}`,
                `Department,${employee.department}`,
                `Country,${employee.country}`,
                `Employment Status,${employee.employmentStatus}`,
                `Employment Type,${employee.employmentType}`,
                `Billing Status,${employee.billingStatus}`,
                `Timesheet Eligibility,${employee.timesheetEligibility}`,
                `Joining Date,${employee.joiningDate}`,
              ];
              csvRows.push("", "# Onboarding Steps", "", ...steps.map((s) => `${s.label},${s.status}`));
              const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${employee.employeeCode}-onboarding-summary.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={14} /> Export Summary (CSV)
          </button>

          <details className="group">
            <summary className="btn btn-secondary text-sm w-full cursor-pointer">
              <MoreVertical size={14} /> More Actions
            </summary>
            <div className="mt-1 space-y-1">
              {currentStep.status === "current" && currentStep.label === "HR Review" && (
                <button type="button" className="btn btn-secondary text-sm w-full" disabled>
                  Reject Onboarding
                </button>
              )}
              <button type="button" className="btn btn-secondary text-sm w-full" disabled>
                Reset to DRAFT
              </button>
              <button type="button" className="btn btn-secondary text-sm w-full" disabled>
                Send Reminder
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

interface ReadOnlySummaryProps {
  fields: { label: string; value: string }[];
  onEdit?: () => void;
}

function ReadOnlySummary({ fields, onEdit }: ReadOnlySummaryProps) {
  return (
    <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.label} className="flex justify-between">
              <span className="text-sm text-gray-500">{f.label}:</span>
              <span className="text-sm text-gray-900">{f.value}</span>
            </div>
          ))}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-accent hover:underline"
        >
          Edit
        </button>
      )}
    </div>
  );
}
