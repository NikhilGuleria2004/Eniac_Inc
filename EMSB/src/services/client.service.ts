import { ClientRepository } from "../repositories/client.repository.js";
import { ProjectRepository } from "../repositories/project.repository.js";
import type { Client } from "../models/client.js";
import type { Role } from "../config/constants.js";
import { NotFoundError, ConflictError } from "../utils/errors.js";
import { toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import type {
  CreateClientInput,
  UpdateClientInput,
  ClientListQuery
} from "../schemas/client.schemas.js";

export interface ClientDTO {
  id: string;
  clientId: string;
  clientCode: string;
  name: string;
  country: string;
  industry: string;
  status: string;
  primaryContact: {
    name: string;
    email: string;
    phone: string;
  };
  activeProjectCount: number;
  createdAt: string;
}

export class ClientService {
  constructor(
    private clientRepository: ClientRepository,
    private projectRepository: ProjectRepository
  ) {}

  async listClients(
    filters: ClientListQuery
  ): Promise<{ clients: ClientDTO[]; total: number; page: number; pageSize: number }> {
    const { clients, total } = await this.clientRepository.findMany({
      status: filters.status,
      industry: filters.industry,
      search: filters.search,
      page: filters.page,
      pageSize: filters.pageSize
    });

    const clientDTOs = await Promise.all(
      clients.map((c) => this.toDTO(c))
    );

    return { clients: clientDTOs, total, page: filters.page, pageSize: filters.pageSize };
  }

  async createClient(input: CreateClientInput, actorRole: Role): Promise<ClientDTO> {
    if (input.code) {
      const existing = await this.clientRepository.findByCode(input.code);
      if (existing) {
        throw new ConflictError("Client code already exists.");
      }
    }

    const clientId = await this.generateClientId();
    const code = input.code ?? (await this.generateClientCode());

    const client: Omit<Client, "_id"> = {
      clientId,
      name: input.name,
      code,
      status: input.status,
      industry: input.industry,
      contact: input.contact,
      address: input.address,
      createdBy: actorRole,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const created = await this.clientRepository.create(client);
    await writeAuditLog(actorRole, "client.created", "client", created.clientId);

    return this.toDTO(created);
  }

  async getClientById(clientId: string): Promise<ClientDTO> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundError("Client was not found.");
    }
    return this.toDTO(client);
  }

  async updateClient(
    clientId: string,
    input: UpdateClientInput,
    actorRole: Role
  ): Promise<ClientDTO> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundError("Client was not found.");
    }

    const update: Partial<Client> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.status !== undefined) update.status = input.status;
    if (input.industry !== undefined) update.industry = input.industry;
    if (input.contact !== undefined) update.contact = input.contact;
    if (input.address !== undefined) update.address = input.address;

    const updated = await this.clientRepository.update(clientId, update);
    if (!updated) {
      throw new NotFoundError("Client was not found.");
    }

    await writeAuditLog(actorRole, "client.updated", "client", clientId);

    return this.toDTO(updated);
  }

  async deactivateClient(clientId: string, actorRole: Role): Promise<ClientDTO> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundError("Client was not found.");
    }

    const updated = await this.clientRepository.deactivate(clientId);
    if (!updated) {
      throw new NotFoundError("Client was not found.");
    }

    await writeAuditLog(actorRole, "client.deactivated", "client", clientId);

    return this.toDTO(updated);
  }

  private async countActiveProjects(clientId: string): Promise<number> {
    const { total } = await this.projectRepository.findMany({
      clientId,
      status: "ACTIVE",
      page: 1,
      pageSize: 1
    });
    return total;
  }

  private async toDTO(client: Client): Promise<ClientDTO> {
    const activeProjectCount = await this.countActiveProjects(client.clientId);
    return {
      id: client.clientId,
      clientId: client.clientId,
      clientCode: client.code ?? client.clientId,
      name: client.name,
      country: client.address?.country ?? "",
      industry: client.industry ?? "",
      status: client.status,
      primaryContact: {
        name: client.contact?.name ?? "",
        email: client.contact?.email ?? "",
        phone: client.contact?.phone ?? ""
      },
      activeProjectCount,
      createdAt: toISO(client.createdAt) ?? ""
    };
  }

  private async generateClientId(): Promise<string> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const maxDoc = await db.collection("clients")
      .findOne({}, { sort: { clientId: -1 }, projection: { clientId: 1 } });

    let nextNum = 1;
    if (maxDoc?.clientId) {
      const match = maxDoc.clientId.match(/CLT-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `CLT-${String(nextNum).padStart(3, "0")}`;
  }

  private async generateClientCode(): Promise<string> {
    const { getDb } = await import("../config/database.js");
    const db = getDb();
    const maxDoc = await db.collection("clients")
      .findOne({}, { sort: { code: -1 }, projection: { code: 1 } });

    let nextNum = 1;
    if (maxDoc?.code) {
      const match = maxDoc.code.match(/CLT(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    return `CLT${String(nextNum).padStart(3, "0")}`;
  }
}
