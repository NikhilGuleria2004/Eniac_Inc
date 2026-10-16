import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getInvoiceTemplates } from "../../data/mock/repositories";
import type { InvoiceTemplate } from "../../types";

export function InvoiceTemplatesPanel() {
  const { addToast } = useToast();
  const initial = useMemo(() => getInvoiceTemplates(), []);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>(initial);

  const setDefault = (id: string) => {
    setTemplates((prev) => prev.map((t) => ({ ...t, isDefault: t.id === id })));
    addToast("success", "Default invoice template updated");
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Invoice Templates" subtitle="Configure the look and default terms of generated invoices" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className={`card ${t.isDefault ? "ring-2 ring-accent" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{t.name}</h2>
                <p className="text-xs text-gray-500">{t.id}</p>
              </div>
              {t.isDefault && <span className="badge badge-success">Default</span>}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <span className="h-4 w-4 rounded border border-gray-300" style={{ backgroundColor: t.primaryColor }} />
              {t.primaryColor}
              {t.secondaryColor && <span className="ml-3 h-4 w-4 rounded border border-gray-300" style={{ backgroundColor: t.secondaryColor }} />}
            </div>
            {t.termsAndConditions && <p className="mt-3 text-xs text-gray-500">T&C: {t.termsAndConditions}</p>}
            {t.paymentInstructions && <p className="mt-1 text-xs text-gray-500">Payment: {t.paymentInstructions}</p>}
            {t.taxSettings && <p className="mt-1 text-xs text-gray-500">Default tax: {t.taxSettings.defaultRate}% ({t.taxSettings.label})</p>}
            <div className="mt-4">
              {t.isDefault ? (
                <p className="flex items-center gap-1 text-sm text-success"><CheckCircle2 size={16} /> Applied to new invoices</p>
              ) : (
                <button className="btn btn-secondary" onClick={() => setDefault(t.id)}>Set as Default</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
