import { InvoiceTemplateRepository } from "../repositories/invoice-template.repository.js";
import type { InvoiceTemplate } from "../models/invoice-template.js";
import type { Role } from "../config/constants.js";
import { NotFoundError } from "../utils/errors.js";
import { writeAuditLog } from "../utils/audit.js";
import type {
  CreateInvoiceTemplateInput,
  UpdateInvoiceTemplateInput
} from "../schemas/invoice-template.schemas.js";

export type InvoiceTemplateDTO = Omit<InvoiceTemplate, "_id" | "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export class InvoiceTemplateService {
  constructor(private repo: InvoiceTemplateRepository) {}

  async listTemplates(search?: string): Promise<InvoiceTemplateDTO[]> {
    const templates = await this.repo.findMany(search);
    return templates.map((t) => this.toDTO(t));
  }

  async getById(invoiceTemplateId: string): Promise<InvoiceTemplateDTO> {
    const template = await this.repo.findById(invoiceTemplateId);
    if (!template) throw new NotFoundError("Invoice template was not found.");
    return this.toDTO(template);
  }

  async getDefault(): Promise<InvoiceTemplateDTO | null> {
    const template = await this.repo.findDefault();
    return template ? this.toDTO(template) : null;
  }

  async createTemplate(input: CreateInvoiceTemplateInput, actorRole: Role, actorUserId?: string): Promise<InvoiceTemplateDTO> {
    const invoiceTemplateId = await this.repo.generateId();
    if (input.isDefault) await this.repo.clearDefaults();
    const template: Omit<InvoiceTemplate, "_id"> = {
      invoiceTemplateId,
      name: input.name,
      logoUrl: input.logoUrl,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      footerNote: input.footerNote,
      termsAndConditions: input.termsAndConditions,
      paymentInstructions: input.paymentInstructions,
      taxSettings: input.taxSettings,
      isDefault: input.isDefault,
      createdBy: actorRole,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const created = await this.repo.create(template);
    await writeAuditLog(actorRole, "invoice.created", "invoice_template", created.invoiceTemplateId, actorUserId);
    return this.toDTO(created);
  }

  async updateTemplate(invoiceTemplateId: string, input: UpdateInvoiceTemplateInput, actorRole: Role, actorUserId?: string): Promise<InvoiceTemplateDTO> {
    const existing = await this.repo.findById(invoiceTemplateId);
    if (!existing) throw new NotFoundError("Invoice template was not found.");

    if (input.isDefault === true) await this.repo.clearDefaults();
    const update: Partial<InvoiceTemplate> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.logoUrl !== undefined) update.logoUrl = input.logoUrl;
    if (input.primaryColor !== undefined) update.primaryColor = input.primaryColor;
    if (input.secondaryColor !== undefined) update.secondaryColor = input.secondaryColor;
    if (input.footerNote !== undefined) update.footerNote = input.footerNote;
    if (input.termsAndConditions !== undefined) update.termsAndConditions = input.termsAndConditions;
    if (input.paymentInstructions !== undefined) update.paymentInstructions = input.paymentInstructions;
    if (input.taxSettings !== undefined) update.taxSettings = input.taxSettings;
    if (input.isDefault !== undefined) update.isDefault = input.isDefault;

    const updated = await this.repo.update(invoiceTemplateId, update);
    await writeAuditLog(actorRole, "invoice.updated", "invoice_template", invoiceTemplateId, actorUserId);
    return this.toDTO(updated!);
  }

  async setDefault(invoiceTemplateId: string, actorRole: Role, actorUserId?: string): Promise<InvoiceTemplateDTO> {
    const existing = await this.repo.findById(invoiceTemplateId);
    if (!existing) throw new NotFoundError("Invoice template was not found.");
    await this.repo.clearDefaults();
    const updated = await this.repo.update(invoiceTemplateId, { isDefault: true });
    await writeAuditLog(actorRole, "invoice.updated", "invoice_template", invoiceTemplateId, actorUserId);
    return this.toDTO(updated!);
  }

  private toDTO(t: InvoiceTemplate): InvoiceTemplateDTO {
    return {
      invoiceTemplateId: t.invoiceTemplateId,
      name: t.name,
      logoUrl: t.logoUrl,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      footerNote: t.footerNote,
      termsAndConditions: t.termsAndConditions,
      paymentInstructions: t.paymentInstructions,
      taxSettings: t.taxSettings,
      isDefault: t.isDefault,
      createdBy: t.createdBy,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    };
  }
}
