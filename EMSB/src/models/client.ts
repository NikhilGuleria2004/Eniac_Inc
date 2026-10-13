import type { ObjectId } from "mongodb";

export interface Client {
  _id: ObjectId;
  clientId: string;
  name: string;
  code?: string;
  status: "ACTIVE" | "INACTIVE" | "PROSPECT" | "SUSPENDED" | "CLOSED";
  industry?: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
