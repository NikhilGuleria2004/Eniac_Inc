import { useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import type { Invoice } from "../../types";

interface InvoiceEmailModalProps {
  open: boolean;
  invoice: Invoice | null;
  clientEmail: string;
  onClose: () => void;
  onSend: (invoiceId: string, email: { to: string; subject: string; body: string }) => void;
}

export function InvoiceEmailModal({ open, invoice, clientEmail, onClose, onSend }: InvoiceEmailModalProps) {
  const [to, setTo] = useState(clientEmail);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  if (!invoice) return null;

  const subjectValue = subject || `Invoice ${invoice.invoiceNumber} from Eniac Inc.`;
  const bodyValue =
    body ||
    `Dear ${invoice.clientName},\n\nPlease find attached invoice ${invoice.invoiceNumber} for ${invoice.subject}.\n\nTotal Due: $${invoice.totalAmount.toFixed(2)} (${invoice.paymentTerms.replace(/_/g, " ")})\nDue Date: ${invoice.dueDate}\n\nThank you for your business.\n\n— Eniac Inc.`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Send Invoice ${invoice.invoiceNumber}`}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => onSend(invoice.id, { to, subject: subjectValue, body: bodyValue })}>Send Invoice</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          <p className="font-medium text-gray-900">Attachment</p>
          <p>{invoice.invoiceNumber}.pdf — {invoice.subject}</p>
        </div>
        <div>
          <label className="form-label">To</label>
          <Input type="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Subject</label>
          <Input value={subjectValue} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Message</label>
          <Textarea value={bodyValue} onChange={(e) => setBody(e.target.value)} rows={8} />
        </div>
      </div>
    </Modal>
  );
}
