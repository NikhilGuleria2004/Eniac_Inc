import type { Collection, Filter } from "mongodb";
import type { Invoice } from "../models/invoice.js";
import type { InvoiceStatus } from "../config/constants.js";
import { getCollection } from "../config/database.js";
import { nextInvoiceSuffix } from "../utils/id-generator.js";

export interface InvoiceListFilters {
  clientId?: string;
  status?: InvoiceStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class InvoiceRepository {
  private get collection(): Collection<Invoice> {
    return getCollection<Invoice>("invoices");
  }

  private async ensureIndexes(): Promise<void> {
    await this.collection.createIndex({ invoiceId: 1 }, { unique: true });
    await this.collection.createIndex({ invoiceNumber: 1 }, { unique: true });
    await this.collection.createIndex({ clientId: 1, status: 1 });
    await this.collection.createIndex({ issueDate: 1 });
  }

  async generateId(): Promise<{ invoiceId: string; invoiceNumber: string }> {
    const year = new Date().getFullYear();
    const max = await this.collection.findOne(
      { invoiceNumber: { $regex: `^INV-${year}-` } },
      { sort: { invoiceNumber: -1 }, projection: { invoiceNumber: 1 } }
    );
    const suffix = nextInvoiceSuffix(max?.invoiceNumber, year);
    return { invoiceId: suffix, invoiceNumber: suffix };
  }

  async findById(invoiceId: string): Promise<Invoice | null> {
    return this.collection.findOne({ invoiceId });
  }

  async findByNumber(invoiceNumber: string): Promise<Invoice | null> {
    return this.collection.findOne({ invoiceNumber });
  }

  async findMany(filters: InvoiceListFilters): Promise<{ invoices: Invoice[]; total: number }> {
    const { page = 1, pageSize = 20, ...queryFilters } = filters;
    const query: Filter<Invoice> = {};
    if (queryFilters.clientId) query.clientId = queryFilters.clientId;
    if (queryFilters.status) query.status = queryFilters.status;
    if (queryFilters.search) {
      const rx = new RegExp(queryFilters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ invoiceNumber: rx }, { clientName: rx }, { subject: rx }, { poNumber: rx }];
    }

    const skip = (page - 1) * pageSize;
    const [invoices, total] = await Promise.all([
      this.collection.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
      this.collection.countDocuments(query)
    ]);
    return { invoices, total };
  }

  async create(invoice: Omit<Invoice, "_id">): Promise<Invoice> {
    await this.ensureIndexes();
    const { ObjectId } = await import("mongodb");
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await this.collection.insertOne({ ...invoice, _id: new ObjectId() });
        return { ...invoice, _id: result.insertedId };
      } catch (error) {
        // E11000 on invoiceNumber: regenerate the number and retry.
        if ((error as { code?: number }).code === 11000 && /invoiceNumber/.test(String((error as Error).message))) {
          lastError = error;
          invoice = { ...invoice, invoiceId: await this.nextSuffix(), invoiceNumber: await this.nextSuffix() };
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  private async nextSuffix(): Promise<string> {
    const year = new Date().getFullYear();
    const max = await this.collection.findOne(
      { invoiceNumber: { $regex: `^INV-${year}-` } },
      { sort: { invoiceNumber: -1 }, projection: { invoiceNumber: 1 } }
    );
    return nextInvoiceSuffix(max?.invoiceNumber, year);
  }

  async update(invoiceId: string, update: Partial<Invoice>): Promise<Invoice | null> {
    await this.collection.updateOne({ invoiceId }, { $set: { ...update, updatedAt: new Date() } });
    return this.findById(invoiceId);
  }

  /**
   * Open (non-terminal) invoices for a client whose periods overlap the given
   * range — backing the composer's duplicate guard.
   */
  async findOverlappingOpen(clientId: string, periodStart: string, periodEnd: string, excludeId?: string): Promise<Invoice[]> {
    return this.collection
      .find({
        clientId,
        ...(excludeId ? { invoiceId: { $ne: excludeId } } : {}),
        status: { $nin: ["VOID", "CANCELLED", "PAID"] },
        periodStart: { $lte: periodEnd },
        periodEnd: { $gte: periodStart },
      })
      .project({ invoiceId: 1, invoiceNumber: 1, status: 1, periodStart: 1, periodEnd: 1 })
      .sort({ periodStart: 1 })
      .limit(10)
      .toArray() as unknown as Promise<Invoice[]>;
  }
}
