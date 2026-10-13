import type { ReactNode } from "react";
import type { OnboardingStep } from "../onboarding";

interface StepSectionProps {
  step: OnboardingStep;
  index: number;
  isActive: boolean;
  children: ReactNode;
}

export function StepSection({ step, index, isActive, children }: StepSectionProps) {
  const sectionColors = {
    complete: "border-green-200 bg-green-50/30",
    current: "border-accent bg-accent/5",
    pending: "border-gray-200 bg-gray-50/30",
  }[step.status];

  const headerColors = {
    complete: "bg-green-600 text-white",
    current: "bg-accent text-white",
    pending: "bg-gray-300 text-gray-500",
  }[step.status];

  return (
    <section
      id={`step-${index + 1}`}
      className={`card mb-4 transition-all duration-200 ${sectionColors} ${isActive ? "ring-2 ring-accent/20" : ""}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${headerColors}`}
        >
          {step.status === "complete" ? "✓" : index + 1}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{step.label}</h3>
        <span
          className={`badge ${
            step.status === "complete"
              ? "badge-success"
              : step.status === "current"
                ? "badge-info"
                : "badge-neutral"
          }`}
        >
          {step.status}
        </span>
      </div>
      <div className="mb-3">
        <p className="text-sm text-gray-600">{step.detail}</p>
      </div>
      {children}
    </section>
  );
}
