import type { ObjectId } from "mongodb";
import type { ClientTier, ClientStatus, PaymentTerms } from "../config/constants.js";

export interface ClientContact {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
}

export interface ClientAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface Client {
  _id: ObjectId;
  clientId: string;
  name: string;
  code?: string;
  status: ClientStatus;
  industry?: string;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  address?: ClientAddress;
  clientTier?: ClientTier;
  paymentTerms?: PaymentTerms;
  taxId?: string;
  contacts?: ClientContact[];
  billingAddress?: ClientAddress;
  shippingAddress?: ClientAddress;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
