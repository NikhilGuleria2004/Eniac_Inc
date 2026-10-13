import type { ObjectId } from "mongodb";

export type DocumentType =
  | "RESUME"
  | "OFFER_LETTER"
  | "EMPLOYMENT_AGREEMENT"
  | "ID_PROOF"
  | "ADDRESS_PROOF"
  | "TAX_DOCUMENT"
  | "BANK_DOCUMENT"
  | "CERTIFICATE"
  | "NDA"
  | "OTHER";

export type DocumentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED";

export interface DocumentMetadata {
  fileName: string;
  mimeType: string;
  size: number;
  storageKey?: string;
}

export interface EmployeeDocument {
  _id: ObjectId;
  documentId: string;
  employeeId: string;
  type: string;
  name: string;
  status: DocumentStatus;
  fileUrl?: string;
  metadata?: DocumentMetadata;
  uploadedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  expiresAt?: Date;
  reviewComments?: string;
  createdAt: Date;
  updatedAt: Date;
}
