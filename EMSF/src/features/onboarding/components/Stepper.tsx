import { ChevronRight } from "lucide-react";
import { getOnboardingProgress } from "../onboarding";
import type { OnboardingStep } from "../onboarding";
import { Tooltip } from "../../../components/ui/Tooltip";

const STEP_TOOLTIP: Record<string, string> = {
  "Employee Information": "Basic contact info — name, email, phone",
  "Employment Details": "Designation, department, type, manager",
  "Geography": "Country, state, city",
  "Billing Classification": "BILLABLE enables timesheet provisioning",
  "Documents": "Required docs must be APPROVED",
  "HR Review": "Final review before activation",
  "Activation": "Sets employee to ACTIVE, triggers provisioning",
  "Timesheet Eligibility": "Final status check",
};

const stepTooltip = (step: OnboardingStep): string =>
  STEP_TOOLTIP[step.label] ?? step.detail;

interface StepperProps {
  steps: OnboardingStep[];
  onStepClick: (index: number) => void;
}

export function Stepper({ steps, onStepClick }: StepperProps) {
  const progress = getOnboardingProgress(steps);

  return (
    <div className="mb-6 overflow-x-auto tabs-scroll -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-2 min-w-[720px]">
        {steps.map((step, index) => {
          const isComplete = step.status === "complete";
          const isCurrent = step.status === "current";
          const isClickable = isComplete;

          return (
            <div key={step.key} className="flex items-center gap-2">
              <Tooltip content={stepTooltip(step)} side="bottom">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(index)}
                  disabled={!isClickable}
                  className="flex flex-col items-center gap-1 focus:outline-none"
                  aria-label={`Go to ${step.label}`}
                >
                  <div
                    className={
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium " +
                      (isCurrent
                        ? "bg-accent text-white ring-2 ring-accent/20"
                        : isComplete
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-100 text-gray-400")
                    }
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={
                      "text-xs text-center max-w-24 " +
                      (isCurrent
                        ? "text-accent font-medium"
                        : isComplete
                          ? "text-gray-700"
                          : "text-gray-400")
                    }
                  >
                    {step.label}
                  </span>
                </button>
              </Tooltip>

              {index < steps.length - 1 && (
                <ChevronRight
                  className={
                    "w-4 h-4 " +
                    (isComplete ? "text-green-600" : "text-gray-300")
                  }
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Step {steps.findIndex((s) => s.status === "current") + 1} of {steps.length}</span>
          <span>{progress}% complete</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
