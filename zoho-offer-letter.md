# Zoho Offer Letter E-Sign Integration — Detailed Implementation Guide

## 1. Overview

This document describes the implementation of Zoho Sign integration for drafting and collecting electronic signatures on offer letters within the Eniac Inc. EMS onboarding flow. The integration connects the existing document workflow with the **Zoho Sign REST API**, allowing HR to:

1. Draft an offer letter for an employee
2. Send it for electronic signature via Zoho Sign
3. Track signature status in real-time
4. Automatically mark the document as approved when signed

### Integration Placement

The e-sign workflow is inserted between **Approve** and **Activate** in the onboarding lifecycle:

```
[HR Review] → [Approve] → [Draft Offer Letter] → [Send for Signature (Zoho)]
                             → [Employee Signs (Zoho)]
                             → [Document APPROVED]
                             → [Activate] → [Timesheet Handoff]
```

Without a signed offer letter, `activateOnboarding` will reject with `422 ONBOARDING_INCOMPLETE`.

---

## 2. Prerequisites

### 2.1 Zoho Account & API Access
- A **Zoho Sign Business** or **Enterprise** plan (required for REST API + webhooks)
- A **Zoho Developer account** registered at `https://api-console.zoho.com`
- API client credentials (client ID + client secret)
- A **refresh token** with scope `ZohoSign.sign.ALL` or `ZohoSign.signdocuments.ALL`
- A configured **sender identity** (the "from" user for signature requests)

### 2.2 Zoho Sign API Reference
- REST API v2 endpoint root: `https://www.zohoapis.com/sign/v2` (or `zoho.eu` for EU accounts)
- Key endpoints used:
  - `POST /envelopes` — create envelope with document + recipients
  - `GET /envelopes/{envelopeId}` — fetch envelope status
  - `DELETE /envelopes/{envelopeId}` — void an envelope (optional)
  - Webhooks: `POST /webhooks` configuration via dashboard

### 2.3 Environment Variables
Add the following to `src/config/env.ts`:

| Variable | Description | Example |
|---|---|---|
| `ZOHO_CLIENT_ID` | OAuth client ID from Zoho API console | `1000.ABCD1234...` |
| `ZOHO_CLIENT_SECRET` | OAuth client secret | `abcdef123456` |
| `ZOHO_REFRESH_TOKEN` | Long-lived refresh token | `1000.xoxo...` |
| `ZOHO_SIGN_URL` | API root (region-dependent) | `https://www.zohoapis.com/sign/v2` |
| `ZOHO_SENDER_ID` | Zoho user ID who sends the documents | `user@company.com` |
| `ZOHO_WEBHOOK_SECRET` | Secret for webhook signature verification | `shoebx_webhook_secret` |
| `ZOHO_SIGN_REDIRECT_URL` | Post-signing redirect for embedded signing | `https://app.eniacinc.com/documents/{docId}/signed` |

---

## 3. Database Schema Changes

### 3.1 Document Model Extension
File: `src/models/document.ts`

Add e-signature fields to the `EmployeeDocument` interface:

```typescript
export type EsignStatus =
  | "PENDING_SIGNATURE"
  | "SIGNED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED";

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

  // --- E-Sign extensions ---
  esignEnvelopeId?: string;   // Zoho envelope identifier
  esignStatus?: EsignStatus;   // Current e-sign state
  esignSignedAt?: Date;        // When all parties signed
  esignSignUrl?: string;       // Zoho signing URL (for embedded or email flow)
  esignExpiresAt?: Date;       // Zoho envelope expiry
  esignTemplates?: string[];   // Zoho template IDs per document type
  // ---

  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 E-Sign Configuration Collection
Create a new MongoDB collection `esign_templates` to map document types to Zoho template IDs:

```json
{
  "_id": { "$oid": "..." },
  "templateId": "TEMPLATE-US-BILLABLE",
  "documentType": "OFFER_LETTER",
  "country": "UNITED_STATES",
  "billingStatus": "BILLABLE",
  "zohoTemplateId": "1234567890123456789",
  "senderId": "hr@eniacinc.com",
  "isEnabled": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

### 3.3 E-Sign Audit Log
Reuse the existing `audit_logs` collection with action keys:
- `document.esign_sent` — HR sends for signature
- `document.esign_completed` — all parties signed
- `document.esign_declined` — recipient declined
- `document.esign_expired` — envelope expired
- `document.esign_voided` — HR cancels the request

---

## 4. Integration Adapter

### 4.1 File Structure
```
src/integrations/esign/
├── esign.adapter.ts     # Interface + concrete adapter
├── zoho.adapter.ts      # Zoho Sign implementation
├── index.ts             # Factory + exports
└── types.ts             # E-sign-specific types
```

### 4.2 Adapter Interface (`esign.adapter.ts`)

```typescript
export interface EsignDocument {
  documentId: string;          // Internal document ID
  employeeName: string;        // Full name of signatory
  employeeEmail: string;       // Email for signing invite
  documentName: string;        // Display name
  fileUrl: string;             // URL or storage key of the PDF
  templateId?: string;         // Zoho template ID for merge fields
  mergeFields: Record<string, string | number>;  // Data for template population
}

export interface EsignEnvelope {
  envelopeId: string;          // Zoho envelope identifier
  status: "PENDING" | "SENT" | "COMPLETED" | "DECLINED" | "CANCELLED" | "EXPIRED";
  signUrl: string;             // URL for the recipient to sign
  expiresAt: Date;             // Envelope expiry
  sentAt: Date;                // When the envelope was sent
}

export interface EsignAdapter {
  createEnvelope(doc: EsignDocument): Promise<EsignEnvelope>;
  getEnvelopeStatus(envelopeId: string): Promise<EsignEnvelope>;
  voidEnvelope(envelopeId: string, reason: string): Promise<void>;
}
```

### 4.3 Zoho Adapter (`zoho.adapter.ts`)

Follow the same caching pattern as `getMailAdapter()`:

```typescript
import { env } from "../../config/env.js";
import { logger } from "../../logger/logger.js";

class ZohoEsignAdapter implements EsignAdapter {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  private async ensureToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry.getTime()) {
      return this.accessToken;
    }
    // Refresh using refresh_token
    const resp = await fetch(`${OAUTH_URL}/oauth/v2/token`, {
      method: "POST",
      body: new URLSearchParams({
        refresh_token: env.ZOHO_REFRESH_TOKEN,
        grant_type: "refresh_token",
        client_id: env.ZOHO_CLIENT_ID,
        client_secret: env.ZOHO_CLIENT_SECRET,
      }),
    });
    const data = await resp.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
    return this.accessToken;
  }

  async createEnvelope(doc: EsignDocument): Promise<EsignEnvelope> {
    const token = await this.ensureToken();
    const payload = this.buildCreatePayload(doc);

    const resp = await fetch(`${env.ZOHO_SIGN_URL}/envelopes`, {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Zoho Sign createEnvelope failed: ${resp.status} ${err}`);
    }

    const result = await resp.json();
    return {
      envelopeId: result.envelope_id,
      status: result.envelope_status || "PENDING",
      signUrl: result.sign_link || result.recipients[0]?.signing_url,
      expiresAt: new Date(result.expiry_time),
      sentAt: new Date(),
    };
  }

  async getEnvelopeStatus(envelopeId: string): Promise<EsignEnvelope> {
    const token = await this.ensureToken();

    const resp = await fetch(
      `${env.ZOHO_SIGN_URL}/envelopes/${envelopeId}`,
      {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      }
    );

    if (!resp.ok) {
      throw new Error(`Zoho Sign getEnvelopeStatus failed: ${resp.status}`);
    }

    const result = await resp.json();
    return {
      envelopeId,
      status: this.mapStatus(result.envelope_status),
      signUrl: result.sign_link || "",
      expiresAt: new Date(result.expiry_time),
      sentAt: new Date(result.sent_time),
    };
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    const token = await this.ensureToken();
    const resp = await fetch(
      `${env.ZOHO_SIGN_URL}/envelopes/${envelopeId}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        body: JSON.stringify({ reason }),
      }
    );
    if (!resp.ok) {
      throw new Error(`Zoho Sign voidEnvelope failed: ${resp.status}`);
    }
  }

  private buildCreatePayload(doc: EsignDocument): Record<string, unknown> {
    // Zoho Sign v2 envelope payload with document, recipients, and merge fields
    // Uses templateId if provided (for templates with pre-configured fields)
    // Otherwise uses document + recipients structure
    ...
  }

  private mapStatus(zohoStatus: string): EsignEnvelope["status"] {
    const map: Record<string, EsignEnvelope["status"]> = {
      "draft": "PENDING",
      "sent": "SENT",
      "completed": "COMPLETED",
      "declined": "DECLINED",
      "canceled": "CANCELLED",
      "expired": "EXPIRED",
    };
    return map[zohoStatus.toLowerCase()] || "PENDING";
  }
}
```

### 4.4 Factory (`index.ts`)

```typescript
import { ZohoEsignAdapter } from "./zoho.adapter.js";
import { LogEsignAdapter } from "./log.adapter.js";  // For dev/test fallback
import { logger } from "../../logger/logger.js";

let cachedAdapter: EsignAdapter | null = null;

export function getEsignAdapter(): EsignAdapter {
  if (cachedAdapter) return cachedAdapter;

  try {
    if (env.ZOHO_CLIENT_ID && env.ZOHO_CLIENT_SECRET) {
      cachedAdapter = new ZohoEsignAdapter();
    } else {
      logger.warn("Zoho e-sign env vars not configured, using log adapter");
      cachedAdapter = new LogEsignAdapter();
    }
  } catch (error) {
    logger.warn({ error }, "Zoho adapter unavailable, falling back to log adapter");
    cachedAdapter = new LogEsignAdapter();
  }

  return cachedAdapter;
}
```

---

## 5. E-Sign Service

### 5.1 File: `src/services/esign.service.ts`

```typescript
export class EsignService {
  constructor(
    private documentRepository: DocumentRepository,
    private employeeRepository: EmployeeRepository,
    private esignRepository: EsignRepository,  // for esign_templates collection
    private adapter: EsignAdapter
  ) {}

  /**
   * Send a document for e-signature via Zoho Sign.
   */
  async sendForSignature(
    documentId: string,
    actorRole: Role
  ): Promise<{ envelopeId: string; signUrl: string; expiresAt: string }> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError("Document was not found.");
    }

    if (doc.status !== "PENDING") {
      throw new BusinessRuleError(
        `Document must be in PENDING status to send for signature. Current: ${doc.status}`,
        "INVALID_DOCUMENT_TRANSITION"
      );
    }

    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Access denied: only HR or Admin can send documents for signature.");
    }

    const employee = await this.employeeRepository.findByEmployeeId(doc.employeeId);
    if (!employee) {
      throw new NotFoundError("Employee was not found.");
    }

    // Determine merge fields from employee data
    const mergeFields = this.buildMergeFields(employee, doc);

    // Look up the configured template
    const template = await this.esignRepository.findByTemplate(
      doc.type,
      employee.country,
      employee.billingStatus
    );

    const envelope = await this.adapter.createEnvelope({
      documentId: doc.documentId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeEmail: employee.email,
      documentName: doc.name,
      fileUrl: doc.fileUrl ?? "",
      templateId: template?.zohoTemplateId,
      mergeFields,
    });

    // Update document with Zoho envelope details
    await this.documentRepository.update(documentId, {
      esignEnvelopeId: envelope.envelopeId,
      esignStatus: "PENDING_SIGNATURE" as EsignStatus,
      esignSignUrl: envelope.signUrl,
      esignExpiresAt: envelope.expiresAt,
      status: "PENDING_SIGNATURE" as DocumentStatus,  // Extend status enum
    });

    await this.createAuditLog(actorRole, "document.esign_sent", "document", documentId);

    // Notify the employee about the signature request
    await emitNotification(
      "onDocumentExpiring",
      { documentId },
      doc.employeeId,
      `${employee.firstName} ${employee.lastName}`,
      doc.name,
      0  // daysUntilExpiry — not used for signature notifications
    );

    return {
      envelopeId: envelope.envelopeId,
      signUrl: envelope.signUrl,
      expiresAt: envelope.expiresAt.toISOString(),
    };
  }

  /**
   * Poll Zoho for the current envelope status and update the document.
   */
  async checkSignatureStatus(documentId: string): Promise<{
    esignStatus: EsignStatus;
    status: DocumentStatus;
    signedAt?: string;
  }> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError("Document was not found.");
    }

    if (!doc.esignEnvelopeId) {
      throw new BusinessRuleError(
        "Document has no e-signature envelope.",
        "NO_ESIGN_ENVELOPE"
      );
    }

    const envelope = await this.adapter.getEnvelopeStatus(doc.esignEnvelopeId);

    if (envelope.status === "COMPLETED" && doc.esignStatus !== "COMPLETED") {
      // Mark document as APPROVED (signed successfully)
      await this.documentRepository.update(documentId, {
        esignStatus: "SIGNED" as EsignStatus,
        esignSignedAt: new Date(),
        status: "APPROVED" as DocumentStatus,
        reviewedAt: new Date(),
        reviewComments: "Electronically signed via Zoho Sign",
      });

      // Fire event: document e-sign completed
      await integrationEvents.documentEsignCompleted({
        documentId: doc.documentId,
        employeeId: doc.employeeId,
        envelopeId: doc.esignEnvelopeId,
        occurredAt: new Date(),
      });

      return { esignStatus: "SIGNED", status: "APPROVED", signedAt: new Date().toISOString() };
    }

    // Update the latest status
    await this.documentRepository.update(documentId, {
      esignStatus: envelope.status === "SIGNED" ? "SIGNED" : envelope.status,
    });

    return {
      esignStatus: envelope.status === "SIGNED" ? "SIGNED" : envelope.status,
      status: doc.status,
    };
  }

  /**
   * HR can cancel an in-progress signature request.
   */
  async cancelSignature(documentId: string, reason: string, actorRole: Role): Promise<void> {
    const doc = await this.documentRepository.findById(documentId);
    if (!doc) {
      throw new NotFoundError("Document was not found.");
    }

    if (!doc.esignEnvelopeId) {
      throw new BusinessRuleError("Document has no e-signature envelope.", "NO_ESIGN_ENVELOPE");
    }

    if (actorRole !== "HR" && actorRole !== "ADMIN") {
      throw new AuthorizationError("Access denied: only HR or Admin can cancel signatures.");
    }

    await this.adapter.voidEnvelope(doc.esignEnvelopeId, reason);

    await this.documentRepository.update(documentId, {
      esignStatus: "CANCELLED" as EsignStatus,
      status: "REJECTED" as DocumentStatus,
      reviewComments: `Signature cancelled by HR: ${reason}`,
    });

    await this.createAuditLog(actorRole, "document.esign_voided", "document", documentId);
  }

  /**
   * Build Zoho Sign merge fields from employee data.
   * Templates use field names like "employee_name", "salary", "position", etc.
   */
  private buildMergeFields(employee: Employee, doc: EmployeeDocument): Record<string, string | number> {
    const comp = employee.compensation;
    const billRate = employee.billRate;

    return {
      employee_name: `${employee.firstName} ${employee.lastName}`,
      employee_id: employee.employeeId,
      email: employee.email,
      position: employee.designation,
      department: employee.department,
      country: employee.country,
      start_date: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split("T")[0] : "",
      salary: comp?.salary ? Number(comp.salary) : 0,
      currency: comp?.currency ?? "USD",
      pay_frequency: comp?.payFrequency ?? "",
      hourly_rate: billRate?.amount ? Number(billRate.amount) : 0,
      bill_rate_currency: billRate?.currency ?? "USD",
      billing_status: employee.billingStatus,
      address_line1: employee.address?.line1 ?? "",
      address_city: employee.address?.city ?? "",
      address_state: employee.address?.state ?? "",
      address_country: employee.address?.country ?? employee.country,
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
}
```

---

## 6. Event Integration

### 6.1 Add Event to Event Bus
File: `src/integrations/events.ts`

```typescript
export interface DocumentEsignCompletedEvent {
  documentId: string;
  employeeId: string;
  envelopeId: string;
  occurredAt: Date;
}

export interface IntegrationEvents {
  // ... existing events
  employeeTimesheetEligibilityChanged(
    event: EmployeeTimesheetEligibilityChangedEvent
  ): Promise<void>;
  employeeActivated(event: EmployeeActivatedEvent): Promise<void>;
  documentEsignCompleted(event: DocumentEsignCompletedEvent): Promise<void>;
}

// In IntegrationEventBus class:
async documentEsignCompleted(event: DocumentEsignCompletedEvent): Promise<void> {
  await this.publish("DocumentEsignCompleted", event);
}
```

### 6.2 Register Listener
File: `src/integrations/event-listeners.ts`

```typescript
import { EsignService } from "../services/esign.service.js";
import { EsignRepository } from "../repositories/esign.repository.js";
// ... existing imports

export function registerEventListeners(): void {
  // ... existing listeners

  // Check if all required documents are now APPROVED after an e-sign completion
  integrationEvents.on(
    "DocumentEsignCompleted",
    async (event: DocumentEsignCompletedEvent) => {
      const employee = await employeeRepository.findByEmployeeId(event.employeeId);
      if (!employee) return;

      // Check if all required onboarding documents are now approved
      const docs = await documentRepository.findByEmployeeId(event.employeeId);
      const requiredTypes = ["OFFER_LETTER", "EMPLOYMENT_AGREEMENT", "ID_PROOF", "ADDRESS_PROOF"];
      const approvedTypes = new Set(
        docs.filter((d) => d.status === "APPROVED").map((d) => d.type)
      );

      if (requiredTypes.every((t) => approvedTypes.has(t))) {
        // All required docs are approved — fire a notification to HR
        const esignService = /* reuse instance or create new */;
        // Or just use the notificationService already instantiated here
        await notificationService.onOnboardingDocumentsComplete(
          event.employeeId,
          `${employee.firstName} ${employee.lastName}`
        );
      }
    }
  );
}
```

### 6.3 Add Notification Method
File: `src/services/notification.service.ts`

```typescript
/**
 * Event: All onboarding documents completed — notify HR.
 */
async onOnboardingDocumentsComplete(
  employeeId: string,
  employeeName: string
): Promise<void> {
  await this.notifyRole(
    "HR",
    "ONBOARDING",
    "Documents complete",
    `All required documents for ${employeeName} are now approved. Onboarding can proceed to activation.`,
    `/onboarding/${employeeId}`
  );
}
```

---

## 7. API Endpoints

### 7.1 Route Registration
File: `src/routes/esign.routes.ts`

```typescript
import { Router } from "express";
import { esignController } from "../controllers/esign.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

const router = Router();
router.use(authenticate);

router.post(
  "/:documentId/send-for-sign",
  requirePermission("onboarding.manage"),
  esignController.sendForSignature
);

router.get(
  "/:documentId/sign-status",
  requireAnyPermission("onboarding.manage", "document.view_self"),
  esignController.getSignStatus
);

router.post(
  "/:documentId/cancel-signature",
  requirePermission("onboarding.manage"),
  esignController.cancelSignature
);

// Webhook endpoint (no auth — verified via Zoho signature header)
router.post(
  "/webhooks/zoho",
  esignController.handleZohoWebhook
);

export default router;
```

Register in the main router (`src/app.ts` or routes index):
```typescript
app.use("/api/v1/documents", esignRoutes);
```

### 7.2 Controller
File: `src/controllers/esign.controller.ts`

```typescript
export const esignController = {
  sendForSignature: async (req, res, next) => {
    try {
      const service = getEsignService();
      const result = await service.sendForSignature(
        req.params.documentId,
        req.user?.role ?? "HR"
      );
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  getSignStatus: async (req, res, next) => {
    try {
      const service = getEsignService();
      const result = await service.checkSignatureStatus(req.params.documentId);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  cancelSignature: async (req, res, next) => {
    try {
      const { reason } = req.body;
      const service = getEsignService();
      await service.cancelSignature(req.params.documentId, reason ?? "", req.user?.role ?? "HR");
      res.json(successResponse({ message: "Signature request cancelled." }));
    } catch (error) {
      next(error);
    }
  },

  handleZohoWebhook: async (req, res, next) => {
    try {
      // Verify webhook signature from Zoho
      const signature = req.headers["x-zoho-signature"] as string;
      if (!verifyZohoWebhookSignature(req.body, signature)) {
        return res.status(401).json({ error: "Invalid webhook signature" });
      }

      const { envelope_id, status, document_id } = req.body;

      // Map Zoho envelope_id to internal document
      const service = getEsignService();
      await service.handleWebhookCallback(envelope_id, status);

      res.status(200).json({ message: "Webhook processed" });
    } catch (error) {
      next(error);
    }
  }
};
```

### 7.3 Schema Validation
File: `src/schemas/esign.schemas.ts`

```typescript
import { z } from "zod";

export const sendForSignatureSchema = z.object({
  documentId: z.string().uuid(),
});

export const cancelSignatureSchema = z.object({
  reason: z.string().min(1).max(500),
});
```

---

## 8. Document Status Model Extension

### 8.1 Extended DocumentStatus Enum
File: `src/models/document.ts`

```typescript
export type DocumentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CHANGES_REQUESTED"
  | "PENDING_SIGNATURE"  // Sent to Zoho, awaiting signature
  | "SIGNED"             // All parties signed, awaiting final review
  | "SIGNATURE_DECLINED" // Recipient declined
  | "SIGNATURE_EXPIRED"  // Envelope expired
;
```

### 8.2 State Transition Rules

```
PENDING
  ├── PENDING_SIGNATURE  (HR sends for signature — e-sign flow)
  ├── APPROVED           (HR approves directly, non-esign docs)
  ├── REJECTED
  └── CHANGES_REQUESTED

PENDING_SIGNATURE
  ├── APPROVED            (Zoho returns "completed" → esign service marks APPROVED)
  ├── SIGNATURE_DECLINED  (Zoho returns "declined")
  ├── SIGNATURE_EXPIRED   (Zoho returns "expired")
  ├── CANCELLED           (HR cancels)
  └── CHANGES_REQUESTED   (HR requests changes → document re-uploaded)

APPROVED (terminal — no further transitions from approved docs)
```

### 8.3 Impact on `validateOnboardingCompletion`
File: `src/services/onboarding.service.ts`

Update the `areRequiredDocumentsUploaded` method:

```typescript
private async areRequiredDocumentsUploaded(employeeId: string): Promise<boolean> {
  const docs = await this.documentRepository.findByEmployeeId(employeeId);
  const approvedTypes = new Set(
    docs.filter((d) => d.status === "APPROVED").map((d) => d.type)
  );
  return REQUIRED_DOCUMENT_TYPES.every((type) => approvedTypes.has(type));
}
```

This already works — documents that went through the Zoho e-sign flow will end up with `status === "APPROVED"` after the signature is complete. The `validateOnboardingCompletion` gate in `approveOnboarding` will naturally require the signed offer letter.

---

## 9. Workflow — Step by Step

### 9.1 HR Drafting the Offer Letter

1. HR creates the employee record (or the onboarding record is created).
2. The required `DOCUMENTS` stage is reached after `EMPLOYEE_INFORMATION`, `EMPLOYMENT_DETAILS`, `GEOGRAPHY`, and `BILLING_CLASSIFICATION` stages are all complete.
3. HR navigates to the Documents section for the employee.
4. HR uploads/generates the offer letter PDF. For the `OFFER_LETTER` document type, instead of directly approving, HR selects "Send for Signature."
5. `POST /api/v1/documents/:documentId/send-for-sign` is called.
6. The `EsignService.sendForSignature()` method:
   - Fetches the document + employee
   - Looks up the Zoho template based on employee's country + billing status
   - Populates merge fields (name, salary, position, etc.)
   - Calls `ZohoEsignAdapter.createEnvelope()` → Zoho returns envelope ID + signing URL
   - Updates the document with `esignEnvelopeId`, `esignStatus: "PENDING_SIGNATURE"`, `status: "PENDING_SIGNATURE"`
   - Audit log: `document.esign_sent`
   - Notification: employee receives a notification (or Zoho sends the email directly)

### 9.2 Employee Signs

7. The employee receives an email from Zoho Sign with a link to the document.
8. Employee clicks the link, reviews the offer letter in Zoho Sign's UI, and signs.
9. **Option A (Webhook):** Zoho sends a POST to `/api/v1/documents/webhooks/zoho` with `{ envelope_id, status: "completed", document_id }`.
   - The controller verifies the webhook signature.
   - Calls `EsignService.handleWebhookCallback(envelopeId, "completed")`.
   - The service finds the document by `esignEnvelopeId`, calls `adapter.getEnvelopeStatus()` to confirm, then:
     - Sets `esignStatus: "SIGNED"`, `esignSignedAt: new Date()`
     - Sets `status: "APPROVED"`, `reviewedAt: new Date()`
     - Fires `integrationEvents.documentEsignCompleted` event
     - Audit log: `document.esign_completed`
   - The event listener checks if all required documents are now APPROVED; if so, notifies HR.

10. **Option B (Polling):** HR manually clicks "Check Status" on the document.
    - `GET /api/v1/documents/:documentId/sign-status` → `EsignService.checkSignatureStatus()`
    - Same update logic as webhook.

### 9.3 HR Approves Onboarding

11. After all 4 required documents are `APPROVED` (including the signed offer letter), HR returns to the onboarding flow.
12. HR calls `POST /api/v1/onboarding/:employeeId/approve`.
13. `approveOnboarding` calls `validateOnboardingCompletion` → `areRequiredDocumentsUploaded` → all docs are `APPROVED` ✓.
14. Onboarding record: status → `COMPLETED`, stage → `ACTIVATION`.
15. Employee is still `ONBOARDING` (not activated).
16. HR calls `POST /api/v1/onboarding/:employeeId/activate`.
17. `activateOnboarding` sets `employmentStatus: ACTIVE`, stage → `TIMESHEET_ELIGIBILITY`, fires `employeeActivated` + `employeeTimesheetEligibilityChanged` events.
18. Timesheet provisioning occurs (BILLABLE → ELIGIBLE).
19. HR sends invitation: `POST /api/v1/onboarding/:employeeId/invite` → employee gets email to set password.

---

## 10. Testing Strategy

### 10.1 Test Structure
File: `tests/esign.test.ts`

```typescript
describe("E-Sign Integration", () => {
  describe("POST /documents/:id/send-for-sign", () => {
    it("HR can send an offer letter for signature");
    it("returns 403 for non-HR roles");
    it("rejects non-PENDING documents");
  });

  describe("GET /documents/:id/sign-status", () => {
    it("HR can check signature status");
    it("employee can check own document status");
    it("returns 403 for non-owner employee");
  });

  describe("Webhook handler", () => {
    it("processes completed signature → document APPROVED");
    it("processes declined signature → document SIGNATURE_DECLINED");
    it("rejects invalid webhook signature");
  });

  describe("State transitions", () => {
    it("PENDING → PENDING_SIGNATURE on send");
    it("PENDING_SIGNATURE → APPROVED on signed");
    it("PENDING_SIGNATURE → SIGNATURE_DECLINED on declined");
    it("cannot send an already-signed document");
  });

  describe("Onboarding integration", () => {
    it("approve blocked when offer letter not yet signed");
    it("approve succeeds when offer letter is APPROVED");
  });
});
```

### 10.2 Mock Adapter
Create `src/integrations/esign/mock.adapter.ts` for testing:

```typescript
export class MockEsignAdapter implements EsignAdapter {
  private envelopes = new Map<string, EsignEnvelope>();

  async createEnvelope(doc: EsignDocument): Promise<EsignEnvelope> {
    const envelope: EsignEnvelope = {
      envelopeId: `MOCK_ENV_${Date.now()}`,
      status: "PENDING",
      signUrl: "https://sandbox.zoho.com/sign/mock",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sentAt: new Date(),
    };
    this.envelopes.set(envelope.envelopeId, envelope);
    return envelope;
  }

  async getEnvelopeStatus(envelopeId: string): Promise<EsignEnvelope> {
    const env = this.envelopes.get(envelopeId);
    if (!env) throw new Error("Envelope not found");
    
    // Simulate a signed document after 2 seconds
    if (Date.now() - new Date(env.sentAt).getTime() > 2000) {
      env.status = "COMPLETED";
    }
    return env;
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    const env = this.envelopes.get(envelopeId);
    if (env) {
      env.status = "CANCELLED";
    }
  }
}
```

### 10.3 Test Data
```typescript
// Create a document with OFFER_LETTER type
// Send for signature
// Simulate webhook with "completed" status
// Verify document status → APPROVED
// Verify audit log entries
// Verify notification fired
```

---

## 11. Error Handling

### 11.1 Zoho API Errors

| Error | HTTP Code | Handling |
|---|---|---|
| Invalid/Expired token | 401 | Auto-refresh token; if refresh fails, log + fall back to log adapter |
| Invalid template ID | 400 | `ZohoSignTemplateError` → return 422 to HR with message |
| Envelope not found | 404 | `ZohoSignEnvelopeNotFound` → mark as `SIGNATURE_DECLINED` + notify HR |
| Rate limited | 429 | Retry with exponential backoff (max 3 retries) |
| Zoho API unavailable | 503 | `ZohoSignUnavailableError` → log + return 502 to HR |
| Webhook signature mismatch | 401 | Reject silently (no retry needed from Zoho) |

### 11.2 Graceful Degradation
- If ZOHO_* env vars are not set, `getEsignAdapter()` falls back to `LogEsignAdapter` (mirrors the mail adapter pattern)
- Failed Zoho calls are logged but don't crash the onboarding flow
- The `sendFor-signature` endpoint returns a 502 with an error message but still creates the document record in `PENDING_SIGNATURE` state so HR can retry

---

## 12. Security Considerations

### 12.1 OAuth Token Management
- **Never store access tokens** — use refresh token flow to obtain short-lived access tokens (typically 1 hour expiry)
- Store refresh token in **environment variables** or a secrets manager (never in code or the database)
- Token refresh is handled transparently by the adapter's `ensureToken()` method

### 12.2 Webhook Verification
- Zoho Sign sends an `X-Zoho-Signature` header for webhook payloads
- The webhook controller must verify this header against `ZOHO_WEBHOOK_SECRET`
- Use HMAC-SHA256 to compare the signature
- Reject any webhook with invalid signature (401)

### 12.3 Document Access Control
- Only HR/Admin can send documents for signature
- Employees can view their own document status
- The signing URL from Zoho is single-use and expires
- All esign operations are audit-logged

### 12.4 Data Privacy
- Employee PII (name, email, salary, address) is passed to Zoho as merge fields
- Zoho Sign's data processing terms must be reviewed for GDPR/compliance
- Consider using Zoho's EU endpoint (`zoho.eu`) for EU-based employees

---

## 13. Repository for E-Sign Templates

### 13.1 File: `src/repositories/esign.repository.ts`

```typescript
export interface EsignTemplate {
  _id: ObjectId;
  templateId: string;        // Internal ID
  documentType: string;      // e.g., "OFFER_LETTER"
  country: string;           // e.g., "INDIA" or "UNITED_STATES"
  billingStatus: string;     // e.g., "BILLABLE" or "NON_BILLABLE"
  zohoTemplateId: string;    // Zoho's template ID
  senderId: string;          // Zoho sender email
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EsignRepository {
  async findByTemplate(
    documentType: string,
    country: string,
    billingStatus: string
  ): Promise<EsignTemplate | null> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    return db.collection("esign_templates").findOne({
      documentType,
      country,
      billingStatus,
      isEnabled: true,
    });
  }

  async create(template: Omit<EsignTemplate, "_id">): Promise<EsignTemplate> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const result = await db.collection("esign_templates").insertOne(template);
    return { _id: result.insertedId, ...template } as EsignTemplate;
  }
}
```

### 13.2 Seed Data (via `src/scripts/seed.ts`)

```typescript
const templates = [
  {
    templateId: "TEMPLATE-INDIA-BILLABLE",
    documentType: "OFFER_LETTER",
    country: "INDIA",
    billingStatus: "BILLABLE",
    zohoTemplateId: process.env.ZOHO_TEMPLATE_INDIA_BILLABLE,
    senderId: "hr@eniacinc.com",
    isEnabled: true,
  },
  {
    templateId: "TEMPLATE-US-BILLABLE",
    documentType: "OFFER_LETTER",
    country: "UNITED_STATES",
    billingStatus: "BILLABLE",
    zohoTemplateId: process.env.ZOHO_TEMPLATE_US_BILLABLE,
    senderId: "hr@eniacinc.com",
    isEnabled: true,
  },
];
```

---

## 14. Frontend Integration (EMSF)

### 14.1 New UI Elements

1. **Document Detail Page** — Add "Send for Signature (Zoho)" button on `OFFER_LETTER` type documents in `PENDING` status
2. **Signature Status Badge** — Display `esignStatus` chip on documents (PENDING_SIGNATURE / SIGNED / DECLINED)
3. **Employee Document Portal** — Employee can see their offer letter's signing status; if they haven't signed, show a "Sign on Zoho" external link button
4. **HR Document Queue** — Table view showing documents awaiting signature with status column

### 14.2 API Calls

```typescript
// In src/features/documents/
const sendForSignature = async (documentId: string) => {
  const res = await api.post(`/documents/${documentId}/send-for-sign`);
  return res.data;
};

const checkSignStatus = async (documentId: string) => {
  const res = await api.get(`/documents/${documentId}/sign-status`);
  return res.data;
};

const cancelSignature = async (documentId: string, reason: string) => {
  const res = await api.post(`/documents/${documentId}/cancel-signature`, { reason });
  return res.data;
};
```

---

## 15. Deployment Checklist

### 15.1 Pre-Deployment
- [ ] Zoho Sign account provisioned with Business/Enterprise plan
- [ ] OAuth app registered in Zoho API console → obtain CLIENT_ID + CLIENT_SECRET
- [ ] OAuth flow completed → obtain REFRESH_TOKEN with `ZohoSign.sign.ALL` scope
- [ ] Zoho template(s) created for offer letters (per country/billing config)
- [ ] Webhook configured in Zoho Sign dashboard → `https://api.eniacinc.com/api/v1/documents/webhooks/zoho`
- [ ] Webhook secret configured in Zoho Sign dashboard → stored as `ZOHO_WEBHOOK_SECRET`
- [ ] All `ZOHO_*` environment variables set in deployment config
- [ ] `esign_templates` collection seeded with template mappings
- [ ] `esignKey` index created on `esignEnvelopeId` in the `documents` collection

### 15.2 Post-Deployment
- [ ] Verify `getEsignAdapter()` returns `ZohoEsignAdapter` (not `LogEsignAdapter`) in production
- [ ] Send a test offer letter from HR → verify Zoho creates envelope
- [ ] Complete a test signature → verify webhook fires → document status updates
- [ ] Verify audit log entries for `document.esign_sent`, `document.esign_completed`
- [ ] Verify notification fires to HR when all docs are complete
- [ ] Verify `approveOnboarding` is blocked until offer letter is `APPROVED`
- [ ] Run `npx vitest run tests/esign.test.ts` — all tests pass

### 15.3 Rollback Plan
- If Zoho integration causes issues, remove the `POST /documents/:id/send-for-sign` route
- HR can manually upload a signed PDF and set document status to `APPROVED` directly
- The core onboarding flow (without e-sign) remains functional
- The env check in `getEsignAdapter()` means setting `ZOHO_CLIENT_ID=""` in env automatically falls back to the log adapter
