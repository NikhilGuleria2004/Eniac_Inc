import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { createClient } from "../../data/mock/repositories";
import { CLIENT_STATUSES, CLIENT_TIERS, PAYMENT_TERMS, COUNTRIES, INDUSTRIES } from "../../data/constants";
import type { Client, Address } from "../../types";

interface ClientFormModalProps {
  open: boolean;
  initialData: Client | null;
  onClose: () => void;
  onSubmit: (data: Omit<Client, "id" | "clientCode" | "activeProjectCount" | "createdAt" | "updatedAt">) => void;
}

const emptyAddress: Address = { line1: "", city: "", country: "United States" };

export function ClientFormModal({ open, initialData, onClose, onSubmit }: ClientFormModalProps) {
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [country, setCountry] = useState("United States");
  const [tier, setTier] = useState<Client["clientTier"]>("SMB");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [billing, setBilling] = useState<Address>(emptyAddress);
  const [sameShipping, setSameShipping] = useState(true);
  const [taxId, setTaxId] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<Client["paymentTerms"]>("NET_30");
  const [status, setStatus] = useState<Client["status"]>("PROSPECT");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setIndustry(initialData.industry);
      setCountry(initialData.country);
      setTier(initialData.clientTier);
      setContactName(initialData.primaryContact.name);
      setContactEmail(initialData.primaryContact.email);
      setContactPhone(initialData.primaryContact.phone);
      setContactRole(initialData.primaryContact.role ?? "");
      setBilling(initialData.billingAddress);
      setSameShipping(!initialData.shippingAddress);
      setTaxId(initialData.taxId ?? "");
      setPaymentTerms(initialData.paymentTerms);
      setStatus(initialData.status);
      setNotes(initialData.notes ?? "");
    } else if (open && !initialData) {
      setName(""); setIndustry("Technology"); setCountry("United States"); setTier("SMB");
      setContactName(""); setContactEmail(""); setContactPhone(""); setContactRole("");
      setBilling(emptyAddress); setSameShipping(true); setTaxId(""); setPaymentTerms("NET_30"); setStatus("PROSPECT"); setNotes("");
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Omit<Client, "id" | "clientCode" | "activeProjectCount" | "createdAt" | "updatedAt"> = {
      name,
      industry,
      country,
      clientTier: tier,
      status,
      primaryContact: { name: contactName, email: contactEmail, phone: contactPhone, role: contactRole || undefined },
      billingAddress: billing,
      shippingAddress: sameShipping ? billing : undefined,
      taxId: taxId || undefined,
      paymentTerms,
      notes: notes || undefined,
    };
    if (!initialData) {
      createClient(payload);
      addToast("success", "Client created");
    } else {
      onSubmit(payload);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Client" : "New Client"}
      size="xl"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="client-form" className="btn btn-primary">{initialData ? "Save Changes" : "Create Client"}</button>
        </>
      }
    >
      <form id="client-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Client Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">Client Code</label>
            <Input value={initialData?.clientCode ?? "Auto-generated"} disabled />
          </div>
          <div>
            <label className="form-label">Industry</label>
            <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Country</label>
            <Select value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Client Tier</label>
            <Select value={tier} onChange={(e) => setTier(e.target.value as Client["clientTier"])}>
              {CLIENT_TIERS.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as Client["status"])}>
              {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        <fieldset className="rounded-md border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">Primary Contact</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="form-label">Name *</label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} required /></div>
            <div><label className="form-label">Email *</label><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required /></div>
            <div><label className="form-label">Phone</label><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
            <div><label className="form-label">Role</label><Input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="e.g. Procurement Lead" /></div>
          </div>
        </fieldset>

        <fieldset className="rounded-md border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">Billing Address</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="form-label">Line 1</label><Input value={billing.line1} onChange={(e) => setBilling({ ...billing, line1: e.target.value })} /></div>
            <div><label className="form-label">City</label><Input value={billing.city} onChange={(e) => setBilling({ ...billing, city: e.target.value })} /></div>
            <div><label className="form-label">State</label><Input value={billing.state ?? ""} onChange={(e) => setBilling({ ...billing, state: e.target.value })} /></div>
            <div><label className="form-label">Postal Code</label><Input value={billing.postalCode ?? ""} onChange={(e) => setBilling({ ...billing, postalCode: e.target.value })} /></div>
            <div>
              <label className="form-label">Country</label>
              <Select value={billing.country} onChange={(e) => setBilling({ ...billing, country: e.target.value })}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
              <input type="checkbox" checked={sameShipping} onChange={(e) => setSameShipping(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
              Shipping address same as billing
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className="form-label">Tax ID / VAT Number</label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></div>
          <div>
            <label className="form-label">Payment Terms</label>
            <Select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value as Client["paymentTerms"])}>
              {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <label className="form-label">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="form-input" rows={3} />
        </div>
      </form>
    </Modal>
  );
}
