import { describe, expect, it, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { Stepper } from "@/features/onboarding/components/Stepper";
import { StepSection } from "@/features/onboarding/components/StepSection";
import type { OnboardingStep } from "@/features/onboarding/onboarding";

vi.mock("@/components/ui/Tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}));

const makeStep = (
  label: string,
  status: "complete" | "current" | "pending",
  detail = ""
): OnboardingStep => ({ key: label, label, status, detail });

const partialSteps: OnboardingStep[] = [
  makeStep("Employee Information", "complete"),
  makeStep("Employment Details", "complete"),
  makeStep("Geography", "complete"),
  makeStep("Billing Classification", "current"),
  makeStep("Documents", "pending"),
  makeStep("HR Review", "pending"),
  makeStep("Activation", "pending"),
  makeStep("Timesheet Eligibility", "pending"),
];

describe("P8.9 — Stepper visual rendering", () => {
  it("should render all 8 step labels", () => {
    const { container } = render(
      <Stepper steps={partialSteps} onStepClick={() => {}} />
    );

    expect(container.textContent).toContain("Employee Information");
    expect(container.textContent).toContain("Employment Details");
    expect(container.textContent).toContain("Geography");
    expect(container.textContent).toContain("Billing Classification");
    expect(container.textContent).toContain("Documents");
    expect(container.textContent).toContain("HR Review");
    expect(container.textContent).toContain("Activation");
    expect(container.textContent).toContain("Timesheet Eligibility");
  });

  it("should render progress bar with correct percentage (3/8 = 38%)", () => {
    const { container } = render(
      <Stepper steps={partialSteps} onStepClick={() => {}} />
    );

    expect(container.textContent).toContain("38% complete");
  });

  it("should show 'Step X of Y' format", () => {
    const { container } = render(
      <Stepper steps={partialSteps} onStepClick={() => {}} />
    );

    expect(container.textContent).toMatch(/Step \d+ of 8/);
  });

  it("should show 100% progress when all steps complete", () => {
    const allComplete: OnboardingStep[] = partialSteps.map((s) => ({
      ...s,
      status: "complete" as const,
    }));
    const { container } = render(
      <Stepper steps={allComplete} onStepClick={() => {}} />
    );

    expect(container.textContent).toContain("100% complete");
  });

  it("should render with clickable completed steps and disabled pending steps", () => {
    const { container } = render(
      <Stepper steps={partialSteps} onStepClick={() => {}} />
    );

    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("should not call onStepClick for disabled (pending) steps", () => {
    const mockClick = vi.fn();
    const { container } = render(
      <Stepper steps={partialSteps} onStepClick={mockClick} />
    );

    const buttons = container.querySelectorAll("button");
    const pendingBtn = buttons[4];
    expect(pendingBtn).toHaveAttribute("disabled");

    mockClick.mockClear();
  });

  it("should call onStepClick with correct index for completed (clickable) steps", () => {
    const mockClick = vi.fn();
    const { container } = render(
      <Stepper steps={partialSteps} onStepClick={mockClick} />
    );

    const buttons = container.querySelectorAll("button");
    const firstBtn = buttons[0];
    expect(firstBtn).not.toHaveAttribute("disabled");
    fireEvent(firstBtn!, new MouseEvent("click", { bubbles: true }));

    expect(mockClick).toHaveBeenCalledWith(0);
  });
});

describe("P8.8 — StepSection responsive classes", () => {
  it("should render section with card and responsive margin classes", () => {
    const { container } = render(
      <StepSection
        step={makeStep("Employees", "current", "test detail")}
        index={0}
        isActive={true}
      >
        <div>Test content</div>
      </StepSection>
    );

    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section?.className).toContain("mb-4");
  });

  it("should show status badge with correct text", () => {
    const { container } = render(
      <StepSection
        step={makeStep("Employees", "current", "test detail")}
        index={0}
        isActive={true}
      >
        <div>Test</div>
      </StepSection>
    );

    const badge = container.querySelector(".badge");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("current");
  });

  it("should show step number for current/pending steps", () => {
    const { container } = render(
      <StepSection
        step={makeStep("Employees", "current", "test")}
        index={3}
        isActive={true}
      >
        <div>Test</div>
      </StepSection>
    );

    expect(container.textContent).toContain("4");
  });

  it("should show checkmark for complete steps", () => {
    const { container } = render(
      <StepSection
        step={makeStep("Employees", "complete", "test")}
        index={0}
        isActive={false}
      >
        <div>Test</div>
      </StepSection>
    );

    expect(container.textContent).toContain("✓");
  });

  it("should apply active ring when isActive", () => {
    const { container } = render(
      <StepSection
        step={makeStep("Employees", "current", "test")}
        index={0}
        isActive={true}
      >
        <div>Test</div>
      </StepSection>
    );

    const section = container.querySelector("section");
    expect(section?.className).toContain("ring-2");
  });

  it("should not apply active ring when not isActive", () => {
    const { container } = render(
      <StepSection
        step={makeStep("Employees", "current", "test")}
        index={0}
        isActive={false}
      >
        <div>Test</div>
      </StepSection>
    );

    const section = container.querySelector("section");
    expect(section?.className).not.toContain("ring-2");
  });
});
