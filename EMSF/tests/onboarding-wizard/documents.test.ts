import { describe, expect, it } from "vitest";
import { getRequiredDocumentStatuses, allRequiredDocumentsApproved, REQUIRED_DOCUMENT_TYPES } from "@/features/onboarding/documents";
import type { Document } from "@/types";

const baseDoc = (overrides: Partial<Document>): Document => ({
  id: "doc-1",
  employeeId: "emp-1",
  name: "Test Doc",
  type: "OFFER_LETTER",
  uploadedAt: "2026-10-01T00:00:00Z",
  status: "APPROVED",
  ...overrides,
});

describe("documents helper", () => {
  describe("REQUIRED_DOCUMENT_TYPES", () => {
    it("should include the 4 required types", () => {
      expect(REQUIRED_DOCUMENT_TYPES).toHaveLength(4);
      expect(REQUIRED_DOCUMENT_TYPES).toContain("OFFER_LETTER");
      expect(REQUIRED_DOCUMENT_TYPES).toContain("EMPLOYMENT_AGREEMENT");
      expect(REQUIRED_DOCUMENT_TYPES).toContain("ID_PROOF");
      expect(REQUIRED_DOCUMENT_TYPES).toContain("ADDRESS_PROOF");
    });
  });

  describe("getRequiredDocumentStatuses", () => {
    it("should return all required types as missing when no docs exist", () => {
      const result = getRequiredDocumentStatuses([]);
      expect(result).toHaveLength(4);
      expect(result.every((r) => !r.hasDoc)).toBe(true);
      expect(result.every((r) => !r.isApproved)).toBe(true);
    });

    it("should mark uploaded and approved docs correctly", () => {
      const docs: Document[] = [
        baseDoc({ type: "OFFER_LETTER", status: "APPROVED" }),
        baseDoc({ id: "doc-2", type: "ID_PROOF", status: "PENDING" }),
      ];
      const result = getRequiredDocumentStatuses(docs);
      const offer = result.find((r) => r.type === "OFFER_LETTER");
      const idProof = result.find((r) => r.type === "ID_PROOF");
      const agreement = result.find((r) => r.type === "EMPLOYMENT_AGREEMENT");

      expect(offer?.hasDoc).toBe(true);
      expect(offer?.isApproved).toBe(true);
      expect(idProof?.hasDoc).toBe(true);
      expect(idProof?.isApproved).toBe(false);
      expect(agreement?.hasDoc).toBe(false);
    });
  });

  describe("allRequiredDocumentsApproved", () => {
    it("should return false when any required doc is missing", () => {
      expect(allRequiredDocumentsApproved([])).toBe(false);
    });

    it("should return false when a required doc exists but is not approved", () => {
      const docs: Document[] = [
        baseDoc({ type: "OFFER_LETTER", status: "APPROVED" }),
        baseDoc({ id: "doc-2", type: "EMPLOYMENT_AGREEMENT", status: "PENDING" }),
        baseDoc({ id: "doc-3", type: "ID_PROOF", status: "APPROVED" }),
        baseDoc({ id: "doc-4", type: "ADDRESS_PROOF", status: "APPROVED" }),
      ];
      expect(allRequiredDocumentsApproved(docs)).toBe(false);
    });

    it("should return true when all 4 required docs are approved", () => {
      const docs: Document[] = [
        baseDoc({ id: "d1", type: "OFFER_LETTER", status: "APPROVED" }),
        baseDoc({ id: "d2", type: "EMPLOYMENT_AGREEMENT", status: "APPROVED" }),
        baseDoc({ id: "d3", type: "ID_PROOF", status: "APPROVED" }),
        baseDoc({ id: "d4", type: "ADDRESS_PROOF", status: "APPROVED" }),
      ];
      expect(allRequiredDocumentsApproved(docs)).toBe(true);
    });
  });
});
