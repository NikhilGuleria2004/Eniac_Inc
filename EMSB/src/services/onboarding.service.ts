import { OnboardingRepository } from "../repositories/onboarding.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import type { OnboardingRecord, OnboardingStage, OnboardingStatus } from "../models/onboarding.js";
import type { EmploymentStatus, Role } from "../config/constants.js";
import { NotFoundError, AuthorizationError, BusinessRuleError } from "../utils/errors.js";
import { toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import { integrationEvents } from "../integrations/events.js";
import { emitNotification } from "../utils/notification-emitter.js";
import type {
  CreateOnboardingInput,
  UpdateOnboardingInput,
  OnboardingListQuery
} from "../schemas/onboarding.schemas.js";
import type { Employee } from "../models/employee.js";

export interface OnboardingDTO {
  employeeId: string;
  currentStage: OnboardingStage;
  status: OnboardingStatus;
  completedStages: OnboardingStage[];
  documentRequirements: {
    type: string;
    name: string;
    required: boolean;
    uploaded: boolean;
  }[];
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const REQUIRED_DOCUMENT_TYPES = [
  "OFFER_LETTER",
  "EMPLOYMENT_AGREEMENT",
  "ID_PROOF",
  "ADDRESS_PROOF"
];

const STAGE_ORDER: OnboardingStage[] = [
  "EMPLOYEE_INFORMATION",
  "EMPLOYMENT_DETAILS",
  "GEOGRAPHY",
  "BILLING_CLASSIFICATION",
  "DOCUMENTS",
  "HR_REVIEW",
  "ACTIVATION",
  "TIMESHEET_ELIGIBILITY"
];

const EMPLOYEE_FIELD_STAGES: Record<OnboardingStage, (keyof Employee)[]> = {
  EMPLOYEE_INFORMATION: ["firstName", "lastName", "email"],
  EMPLOYMENT_DETAILS: ["designation", "department", "employmentType"],
  GEOGRAPHY: ["country"],
  BILLING_CLASSIFICATION: ["billingStatus"],
  DOCUMENTS: [],
  HR_REVIEW: [],
  ACTIVATION: [],
  TIMESHEET_ELIGIBILITY: []
};

export class OnboardingService {
  constructor(
    private onboardingRepository: OnboardingRepository,
    private employeeRepository: EmployeeRepository,
    private documentRepository: DocumentRepository
  ) {}



  async listOnboarding(
    filters: OnboardingListQuery
  ): Promise<{ records: OnboardingDTO[]; total: number; page: number; pageSize: number }> {
    const { records, total } = await this.onboardingRepository.findMany({
      status: filters.status,
      stage: filters.stage,
      search: filters.search,
      page: filters.page,
      pageSize: filters.pageSize
    });

    return {
      records: records.map((r) => this.toDTO(r)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async createOnboarding(
    input: CreateOnboardingInput,
    actorRole: Role,
    actorUserId: string
  ): Promise<OnboardingDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Access denied: only HR or Admin can create onboarding records.");
    }

    const employee = await this.employeeRepository.findByEmployeeId(input.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    const existing = await this.onboardingRepository.findByEmployeeId(input.employeeId);
    if (existing) {
      throw new BusinessRuleError(
        "Onboarding record already exists for this employee.",
        "ONBOARDING_EXISTS"
      );
    }

    const record: Omit<OnboardingRecord, "_id"> = {
      employeeId: input.employeeId,
      currentStage: "EMPLOYEE_INFORMATION",
      status: "DRAFT",
      completedStages: [],
      documentRequirements: (input.documentRequirements ?? REQUIRED_DOCUMENT_TYPES.map((type) => ({
        type,
        name: `${type.replace(/_/g, " ")}`,
        required: true,
        uploaded: false
      }))),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.onboardingRepository.create(record);
    await this.createAuditLog(actorRole, "onboarding.created", "onboarding", created.employeeId, actorUserId);

    return this.toDTO(created);
  }

  async getOnboarding(
    employeeId: string,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<OnboardingDTO> {
    const record = await this.onboardingRepository.findByEmployeeId(employeeId);
    if (!record) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    if (actorRole === "EMPLOYEE" && requestingEmployeeId !== employeeId) {
      throw new AuthorizationError("Access denied: cannot view another employee's onboarding record.");
    }

    return this.toDTO(record);
  }

  async updateOnboarding(
    employeeId: string,
    input: UpdateOnboardingInput,
    actorRole: Role,
    actorUserId: string
  ): Promise<OnboardingDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Access denied: only HR or Admin can update onboarding records.");
    }

    const record = await this.onboardingRepository.findByEmployeeId(employeeId);
    if (!record) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    const update: Partial<OnboardingRecord> = {};
    if (input.currentStage !== undefined) {
      // C1: Validate stage ordering — reject out-of-order or skipped stages
      this.validateStageProgression(record.currentStage, input.currentStage);
      update.currentStage = input.currentStage;
    }
    if (input.status !== undefined) update.status = input.status;
    if (input.documentRequirements !== undefined) {
      update.documentRequirements = input.documentRequirements;
    }
    if (input.reviewNotes !== undefined) update.reviewNotes = input.reviewNotes;

    const updated = await this.onboardingRepository.update(employeeId, update);
    if (!updated) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    if (input.billingStatus) {
      // B2: HR classifies billing (BILLING_CLASSIFICATION stage) via the
      // onboarding update. Writes the billing status onto the employee so
      // downstream eligibility (timesheet transfer) reflects it. HR's explicit
      // value wins over any country-based default.
      await this.employeeRepository.updateBillingStatus(employeeId, input.billingStatus);
      await this.createAuditLog(actorRole, "employee.billing_status_set", "employee", employeeId, actorUserId);
    }

    await this.createAuditLog(actorRole, "onboarding.updated", "onboarding", employeeId, actorUserId);
    return this.toDTO(updated);
  }

  async submitOnboarding(
    employeeId: string,
    actorRole: Role,
    actorUserId: string
  ): Promise<OnboardingDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN" && actorRole !== "EMPLOYEE") {
      throw new AuthorizationError("Access denied: cannot submit onboarding.");
    }

    const record = await this.onboardingRepository.findByEmployeeId(employeeId);
    if (!record) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    if (actorRole === "EMPLOYEE") {
      if (record.employeeId !== employeeId) {
        throw new AuthorizationError("Access denied: cannot submit another employee's onboarding.");
      }
    }

    const allowedFrom: OnboardingStatus[] = ["DRAFT", "IN_PROGRESS", "REJECTED"];
    if (!allowedFrom.includes(record.status)) {
      throw new BusinessRuleError(
        `Cannot submit onboarding from status ${record.status}`,
        "INVALID_ONBOARDING_ACTION"
      );
    }

    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    // C1: Validate that the current stage's requirements are met before
    // advancing. If the current stage is a data stage and its required
    // employee fields are not populated, reject with 422.
    const requirements = EMPLOYEE_FIELD_STAGES[record.currentStage] ?? [];
    const missing = requirements.filter((field) => {
      const value = employee[field];
      return value === undefined || value === null || value === "";
    });

    if (missing.length > 0 && requirements.length > 0) {
      throw new BusinessRuleError(
        `Cannot proceed: ${record.currentStage.replace(/_/g, " ").toLowerCase()} is incomplete (${missing.join(", ")}).`,
        "ONBOARDING_INCOMPLETE"
      );
    }

    // C1: Mark the current stage (and any consecutively completable data
    // stages) as complete in completedStages, then advance to the next
    // incomplete stage or to HR_REVIEW if all data stages are done.
    const completedStages = [...record.completedStages];
    let nextStage = record.currentStage;

    for (const stage of STAGE_ORDER) {
      if (stage === "HR_REVIEW" || stage === "ACTIVATION" || stage === "TIMESHEET_ELIGIBILITY" || stage === "DOCUMENTS") {
        break;
      }
      const stageReqs = EMPLOYEE_FIELD_STAGES[stage];
      if (stageReqs.length === 0) continue;

      const stageMissing = stageReqs.filter((field) => {
        const value = employee[field];
        return value === undefined || value === null || value === "";
      });

      if (stageMissing.length > 0) {
        nextStage = stage;
        break;
      }

      if (!completedStages.includes(stage)) {
        completedStages.push(stage);
      }
      const idx = STAGE_ORDER.indexOf(stage);
      if (idx >= 0) {
        nextStage = STAGE_ORDER[idx + 1] ?? "HR_REVIEW";
      }
    }

    // If all data stages are complete, land at HR_REVIEW
    if (completedStages.includes("BILLING_CLASSIFICATION")) {
      nextStage = "HR_REVIEW";
    }

    const updated = await this.onboardingRepository.updateStageAndStatus(
      employeeId,
      nextStage,
      "AWAITING_REVIEW",
      { completedStages }
    );
    if (!updated) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    await this.createAuditLog(actorRole, "onboarding.submitted", "onboarding", employeeId, actorUserId);
    await this.emitOnboardingAwaitingReview(
      employeeId,
      employee ? `${employee.firstName} ${employee.lastName}` : ""
    );
    return this.toDTO(updated);
  }

  async reviewOnboarding(
    employeeId: string,
    reviewNotes: string,
    actorRole: Role,
    actorUserId: string
  ): Promise<OnboardingDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Access denied: only HR or Admin can review onboarding.");
    }

    const record = await this.onboardingRepository.findByEmployeeId(employeeId);
    if (!record) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    if (record.status !== "AWAITING_REVIEW") {
      throw new BusinessRuleError(
        "Onboarding must be awaiting review to review.",
        "INVALID_ONBOARDING_ACTION"
      );
    }

    const updated = await this.onboardingRepository.update(employeeId, {
      status: "REVIEWED",
      reviewNotes,
      reviewedBy: actorRole,
      reviewedAt: new Date()
    });
    if (!updated) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    await this.createAuditLog(actorRole, "onboarding.reviewed", "onboarding", employeeId, actorUserId);
    return this.toDTO(updated);
  }

  async approveOnboarding(
    employeeId: string,
    actorRole: Role,
    actorUserId: string
  ): Promise<OnboardingDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Access denied: only HR or Admin can approve onboarding.");
    }

    const record = await this.onboardingRepository.findByEmployeeId(employeeId);
    if (!record) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    if (record.status !== "REVIEWED") {
      throw new BusinessRuleError(
        "Onboarding must be reviewed before approval.",
        "INVALID_ONBOARDING_ACTION"
      );
    }

    const completed = await this.validateOnboardingCompletion(employeeId);
    if (!completed) {
      throw new BusinessRuleError(
        "Cannot activate employee until all required onboarding steps are complete.",
        "ONBOARDING_INCOMPLETE"
      );
    }

    // C3: validateOnboardingCompletion already verified all required documents
    // are APPROVED in the documents collection. Mark DOCUMENTS as complete
    // in completedStages and proceed to activation.
    const completedStages: OnboardingStage[] = record.completedStages.includes("DOCUMENTS")
      ? record.completedStages
      : [...record.completedStages, "DOCUMENTS"];

    const updated = await this.onboardingRepository.updateStageAndStatus(
      employeeId,
      "ACTIVATION",
      "COMPLETED",
      { completedStages }
    );
    if (!updated) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    await this.createAuditLog(actorRole, "onboarding.approved", "onboarding", employeeId, actorUserId);
    return this.toDTO(updated);
  }

  async rejectOnboarding(
    employeeId: string,
    rejectionReason: string,
    actorRole: Role,
    actorUserId: string
  ): Promise<OnboardingDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Access denied: only HR or Admin can reject onboarding.");
    }

    const record = await this.onboardingRepository.findByEmployeeId(employeeId);
    if (!record) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    const allowedFrom: OnboardingStatus[] = ["AWAITING_REVIEW", "REVIEWED"];
    if (!allowedFrom.includes(record.status)) {
      throw new BusinessRuleError(
        `Cannot reject onboarding from status ${record.status}`,
        "INVALID_ONBOARDING_ACTION"
      );
    }

    const updated = await this.onboardingRepository.update(employeeId, {
      status: "REJECTED",
      rejectionReason,
      currentStage: "EMPLOYEE_INFORMATION"
    });
    if (!updated) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    await this.createAuditLog(actorRole, "onboarding.rejected", "onboarding", employeeId, actorUserId);
    return this.toDTO(updated);
  }

  async activateOnboarding(
    employeeId: string,
    actorRole: Role,
    actorUserId: string
  ): Promise<OnboardingDTO> {
    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Access denied: only HR or Admin can activate onboarding.");
    }

    const record = await this.onboardingRepository.findByEmployeeId(employeeId);
    if (!record) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    if (record.status !== "COMPLETED") {
      throw new BusinessRuleError(
        "Onboarding must be approved before activation.",
        "INVALID_ONBOARDING_ACTION"
      );
    }

    const updated = await this.onboardingRepository.updateStageAndStatus(
      employeeId,
      "TIMESHEET_ELIGIBILITY",
      "COMPLETED",
      { activatedAt: new Date() }
    );
    if (!updated) {
      throw new NotFoundError("Onboarding record was not found.");
    }

    await this.employeeRepository.updateEmploymentStatus(employeeId, "ACTIVE" as EmploymentStatus);
    const activatedEmployee = await this.employeeRepository.findByEmployeeId(employeeId);
    await integrationEvents.employeeActivated({
      employeeId,
      employeeName: activatedEmployee
        ? `${activatedEmployee.firstName} ${activatedEmployee.lastName}`
        : "",
      managerId: activatedEmployee?.managerId,
      occurredAt: new Date()
    });

    // Hand off to the timesheet platform: recompute + persist the employee's
    // timesheet provisioning record via the same listener path used by the
    // employee-lifecycle activation endpoint (src/services/employee.service.ts).
    // The listener re-fetches the employee (now ACTIVE) so eligibility reflects
    // the post-activation state. Side-effect failures are swallowed by the bus
    // and never break the onboarding write.
    await integrationEvents.employeeTimesheetEligibilityChanged({
      employeeId,
      occurredAt: new Date()
    });

    await this.createAuditLog(actorRole, "onboarding.activated", "onboarding", employeeId, actorUserId);
    return this.toDTO(updated);
  }

  /**
   * C1: Validate that advancing to a new stage respects the linear
   * stage ordering. Rejects skipping ahead or jumping backwards
   * (except REJECTED→resubmit path handled elsewhere).
   */
  private validateStageProgression(current: OnboardingStage, target: OnboardingStage): void {
    const currentIndex = STAGE_ORDER.indexOf(current);
    const targetIndex = STAGE_ORDER.indexOf(target);

    if (targetIndex < 0 || currentIndex < 0) {
      throw new BusinessRuleError(
        `Invalid stage: ${target}`,
        "INVALID_ONBOARDING_ACTION"
      );
    }

    if (targetIndex > currentIndex + 1) {
      throw new BusinessRuleError(
        `Cannot skip stages: ${STAGE_ORDER[currentIndex]} → ${STAGE_ORDER[targetIndex]}. Advance one stage at a time.`,
        "INVALID_ONBOARDING_ACTION"
      );
    }
  }

  /**
   * C2/C3: Validate that all required documents are uploaded and APPROVED
   * in the documents collection for the given employee.
   */
  private async areRequiredDocumentsUploaded(employeeId: string): Promise<boolean> {
    const docs = await this.documentRepository.findByEmployeeId(employeeId);
    const approvedTypes = new Set(
      docs.filter((d) => d.status === "APPROVED").map((d) => d.type)
    );
    return REQUIRED_DOCUMENT_TYPES.every((type) => approvedTypes.has(type));
  }

  private async validateOnboardingCompletion(employeeId: string): Promise<boolean> {
    const employee = await this.employeeRepository.findByEmployeeId(employeeId);
    if (!employee) {
      return false;
    }

    const hasInfo = Boolean(employee.firstName && employee.lastName && employee.email);
    const hasEmployment = Boolean(employee.designation && employee.department);
    const hasGeo = Boolean(employee.country && employee.address?.city);
    const hasBilling = Boolean(employee.billingStatus);

    const dataComplete = hasInfo && hasEmployment && hasGeo && hasBilling;
    if (!dataComplete) {
      return false;
    }

    // C2: Required documents must be present and APPROVED
    const docsComplete = await this.areRequiredDocumentsUploaded(employeeId);
    if (!docsComplete) {
      return false;
    }

    return true;
  }

  private toDTO(record: OnboardingRecord): OnboardingDTO {
    return {
      employeeId: record.employeeId,
      currentStage: record.currentStage,
      status: record.status,
      completedStages: record.completedStages,
      documentRequirements: record.documentRequirements.map((d) => ({
        type: d.type,
        name: d.name,
        required: d.required,
        uploaded: d.uploaded
      })),
      reviewNotes: record.reviewNotes,
      reviewedBy: record.reviewedBy,
      reviewedAt: toISO(record.reviewedAt),
      rejectionReason: record.rejectionReason,
      activatedAt: toISO(record.activatedAt),
      createdAt: toISO(record.createdAt) ?? "",
      updatedAt: toISO(record.updatedAt) ?? ""
    };
  }

  private async createAuditLog(
    actorRole: Role,
    action: string,
    entityType: string,
    entityId: string,
    actorUserId: string
  ): Promise<void> {
    await writeAuditLog(actorRole, action, entityType, entityId, actorUserId);
  }

   private async emitOnboardingAwaitingReview(
    employeeId: string,
    employeeName: string
  ): Promise<void> {
    await emitNotification(
      "onOnboardingAwaitingReview",
      { employeeId },
      employeeId,
      employeeName
    );
  }
}
