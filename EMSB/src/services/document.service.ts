import { DocumentRepository } from "../repositories/document.repository.js";
import { EmployeeRepository } from "../repositories/employee.repository.js";
import type { EmployeeDocument, DocumentStatus } from "../models/document.js";
import type { Role } from "../config/constants.js";
import { NotFoundError, BusinessRuleError } from "../utils/errors.js";
import { toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import { emitNotification } from "../utils/notification-emitter.js";
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentListQuery
} from "../schemas/document.schemas.js";

export interface DocumentDTO {
  id: string;
  documentId: string;
  employeeId: string;
  type: string;
  name: string;
  status: DocumentStatus;
  fileUrl?: string;
  mimeType?: string;
  size?: number;
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  expiresAt?: string;
  reviewComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpiringDocumentDTO {
  id: string;
  documentId: string;
  employeeId: string;
  name: string;
  expiresAt: string;
  daysUntilExpiry: number;
}

export class DocumentService {
  constructor(
    private documentRepository: DocumentRepository,
    private employeeRepository: EmployeeRepository
  ) {}

  async listDocuments(
    filters: DocumentListQuery,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<{ documents: DocumentDTO[]; total: number; page: number; pageSize: number }> {
    if (actorRole === "EMPLOYEE") {
      if (!requestingEmployeeId) {
        return { documents: [], total: 0, page: filters.page, pageSize: filters.pageSize };
      }
      const { documents, total } = await this.documentRepository.findMany({
        ...filters,
        employeeId: requestingEmployeeId
      });
      return {
        documents: documents.map((d) => this.toDTO(d)),
        total,
        page: filters.page,
        pageSize: filters.pageSize
      };
    }

    const { documents, total } = await this.documentRepository.findMany(filters);

    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      return { documents: [], total: 0, page: filters.page, pageSize: filters.pageSize };
    }

    return {
      documents: documents.map((d) => this.toDTO(d)),
      total,
      page: filters.page,
      pageSize: filters.pageSize
    };
  }

  async createDocument(input: CreateDocumentInput, actorRole: Role, requestingEmployeeId?: string): Promise<DocumentDTO> {
    const employee = await this.employeeRepository.findByEmployeeId(input.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    if (actorRole === "EMPLOYEE" && requestingEmployeeId !== input.employeeId) {
      throw new NotFoundError("You can only upload documents for yourself.");
    }

    const documentId = await this.generateDocumentId();

    const doc: Omit<EmployeeDocument, "_id"> = {
      documentId,
      employeeId: input.employeeId,
      type: input.type,
      name: input.name,
      status: "PENDING",
      fileUrl: input.fileUrl,
      metadata: input.metadata,
      uploadedAt: new Date(),
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.documentRepository.create(doc);
    await this.createAuditLog(actorRole, "document.uploaded", "document", created.documentId);

    return this.toDTO(created);
  }

  async getDocumentById(
    documentId: string,
    actorRole: Role,
    requestingEmployeeId?: string
  ): Promise<DocumentDTO> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError("Document was not found.");
    }

    if (actorRole === "EMPLOYEE" && doc.employeeId !== requestingEmployeeId) {
      throw new NotFoundError("Document was not found.");
    }

    return this.toDTO(doc);
  }

  async updateDocument(
    documentId: string,
    input: UpdateDocumentInput,
    actorRole: Role
  ): Promise<DocumentDTO> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError("Document was not found.");
    }

    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new NotFoundError("Document was not found.");
    }

    const update: Partial<EmployeeDocument> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.fileUrl !== undefined) update.fileUrl = input.fileUrl;
    if (input.type !== undefined) update.type = input.type;
    if (input.metadata !== undefined) update.metadata = input.metadata;
    if (input.expiresAt !== undefined) update.expiresAt = input.expiresAt;

    const updated = await this.documentRepository.update(documentId, update);
    if (!updated) {
      throw new NotFoundError("Document was not found.");
    }

    await this.createAuditLog(actorRole, "document.updated", "document", documentId);
    return this.toDTO(updated);
  }

  async approveDocument(
    documentId: string,
    comments: string,
    actorRole: Role
  ): Promise<DocumentDTO> {
    return this.reviewDocument(documentId, "APPROVED", comments, actorRole);
  }

  async rejectDocument(
    documentId: string,
    comments: string,
    actorRole: Role
  ): Promise<DocumentDTO> {
    return this.reviewDocument(documentId, "REJECTED", comments, actorRole);
  }

  async requestChanges(
    documentId: string,
    comments: string,
    actorRole: Role
  ): Promise<DocumentDTO> {
    return this.reviewDocument(documentId, "CHANGES_REQUESTED", comments, actorRole);
  }

  private async reviewDocument(
    documentId: string,
    status: DocumentStatus,
    comments: string,
    actorRole: Role
  ): Promise<DocumentDTO> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError("Document was not found.");
    }

    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new NotFoundError("Document was not found.");
    }

    const validTransitions: Record<DocumentStatus, DocumentStatus[]> = {
      PENDING: ["APPROVED", "REJECTED", "CHANGES_REQUESTED"],
      APPROVED: [],
      REJECTED: ["APPROVED"],
      CHANGES_REQUESTED: ["APPROVED", "REJECTED"]
    };

    const allowed = validTransitions[doc.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BusinessRuleError(
        `Cannot transition document from ${doc.status} to ${status}`,
        "INVALID_DOCUMENT_TRANSITION"
      );
    }

    const updated = await this.documentRepository.updateStatus(
      documentId,
      status,
      {
        reviewedBy: actorRole,
        reviewedAt: new Date(),
        reviewComments: comments
      }
    );
    if (!updated) {
      throw new NotFoundError("Document was not found.");
    }

    const actionMap: Record<DocumentStatus, string> = {
      PENDING: "document.updated",
      APPROVED: "document.approved",
      REJECTED: "document.rejected",
      CHANGES_REQUESTED: "document.changes_requested"
    };

    await this.createAuditLog(actorRole, actionMap[status], "document", documentId);
    await this.emitOnDocumentReviewed(updated, status as Exclude<DocumentStatus, "PENDING">);
    return this.toDTO(updated);
  }

  async getExpiringSoon(expiryDays: number): Promise<ExpiringDocumentDTO[]> {
    const docs = await this.documentRepository.getExpiringSoon(expiryDays);
    return docs.map((d) => {
      const expiryDate = new Date(d.expiresAt!);
      const now = new Date();
      const timeDiff = expiryDate.getTime() - now.getTime();
      const daysUntilExpiry = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      return {
        id: d.documentId,
        documentId: d.documentId,
        employeeId: d.employeeId,
        name: d.name,
        expiresAt: toISO(d.expiresAt) ?? "",
        daysUntilExpiry
      };
    });
  }

  async getExpired(): Promise<DocumentDTO[]> {
    const docs = await this.documentRepository.getExpired();
    return docs.map((d) => this.toDTO(d));
  }

  private async generateDocumentId(): Promise<string> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const maxDoc = await db.collection("documents")
      .findOne({}, { sort: { documentId: -1 }, projection: { documentId: 1 } });

    let nextNum = 1;
    if (maxDoc?.documentId) {
      const match = maxDoc.documentId.match(/DOC-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `DOC-${String(nextNum).padStart(4, "0")}`;
  }

  private toDTO(doc: EmployeeDocument): DocumentDTO {
    return {
      id: doc.documentId,
      documentId: doc.documentId,
      employeeId: doc.employeeId,
      type: doc.type,
      name: doc.name,
      status: doc.status,
      fileUrl: doc.fileUrl,
      mimeType: doc.metadata?.mimeType,
      size: doc.metadata?.size,
      uploadedAt: toISO(doc.uploadedAt) ?? "",
      reviewedAt: toISO(doc.reviewedAt),
      reviewedBy: doc.reviewedBy,
      expiresAt: toISO(doc.expiresAt),
      reviewComments: doc.reviewComments,
      createdAt: toISO(doc.createdAt) ?? "",
      updatedAt: toISO(doc.updatedAt) ?? ""
    };
  }

  private async createAuditLog(
    actorRole: Role,
    action: string,
    entityType: string,
    entityId: string
  ): Promise<void> {
    await writeAuditLog(actorRole, action, entityType, entityId);
  }

   private async emitOnDocumentReviewed(
     doc: EmployeeDocument,
     status: Exclude<DocumentStatus, "PENDING">
   ): Promise<void> {
     const employee = await this.employeeRepository.findByEmployeeId(doc.employeeId);
     await emitNotification(
       "onDocumentReviewed",
       { documentId: doc.documentId },
       doc.employeeId,
       employee ? `${employee.firstName} ${employee.lastName}` : "",
       doc.name,
       status
     );
   }
}