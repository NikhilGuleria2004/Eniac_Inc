import type { Collection, Filter } from "mongodb";
import type { InvoiceTemplate } from "../models/invoice-template.js";
import { getCollection } from "../config/database.js";

export class InvoiceTemplateRepository {
  private get collection(): Collection<InvoiceTemplate> {
    return getCollection<InvoiceTemplate>("invoice_templates");
  }

  private async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ invoiceTemplateId: 1 }, { unique: true });
  }

  async generateId(): Promise<string> {
    const maxDoc = await this.collection.findOne({}, { sort: { invoiceTemplateId: -1 }, projection: { invoiceTemplateId: 1 } });
    let nextNum = 1;
    if (maxDoc?.invoiceTemplateId) {
      const match = maxDoc.invoiceTemplateId.match(/TPL-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `TPL-${String(nextNum).padStart(3, "0")}`;
  }

  async findById(invoiceTemplateId: string): Promise<InvoiceTemplate | null> {
    return this.collection.findOne({ invoiceTemplateId });
  }

  async findDefault(): Promise<InvoiceTemplate | null> {
    return this.collection.findOne({ isDefault: true });
  }

  async findMany(search?: string): Promise<InvoiceTemplate[]> {
    const query: Filter<InvoiceTemplate> = {};
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.name = rx;
    }
    return this.collection.find(query).sort({ isDefault: -1, createdAt: 1 }).toArray();
  }

  async create(template: Omit<InvoiceTemplate, "_id">): Promise<InvoiceTemplate> {
    await this.ensureIndexes();
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({ ...template, _id: new ObjectId() });
    return { ...template, _id: result.insertedId };
  }

  async update(invoiceTemplateId: string, update: Partial<InvoiceTemplate>): Promise<InvoiceTemplate | null> {
    await this.collection.updateOne(
      { invoiceTemplateId },
      { $set: { ...update, updatedAt: new Date() } }
    );
    return this.findById(invoiceTemplateId);
  }

  async clearDefaults(): Promise<void> {
    await this.collection.updateMany(
      { isDefault: true },
      { $set: { isDefault: false, updatedAt: new Date() } }
    );
  }
}
