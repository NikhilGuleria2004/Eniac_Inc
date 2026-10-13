import type { Document } from "../../types";

export const REQUIRED_DOCUMENT_TYPES: Document["type"][] = [
  "OFFER_LETTER",
  "EMPLOYMENT_AGREEMENT",
  "ID_PROOF",
  "ADDRESS_PROOF",
];

export function getRequiredDocumentStatuses(documents: Document[]): {
  type: Document["type"];
  doc: Document | undefined;
  hasDoc: boolean;
  isApproved: boolean;
}[] {
  return REQUIRED_DOCUMENT_TYPES.map((type) => {
    const doc = documents.find((d) => d.type === type);
    return {
      type,
      doc,
      hasDoc: Boolean(doc),
      isApproved: doc?.status === "APPROVED",
    };
  });
}

export function allRequiredDocumentsApproved(documents: Document[]): boolean {
  return getRequiredDocumentStatuses(documents).every((r) => r.isApproved);
}
