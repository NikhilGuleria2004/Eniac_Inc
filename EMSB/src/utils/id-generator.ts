export function nextInvoiceSuffix(maxInvoiceNumber?: string, year?: number): string {
  const currentYear = year ?? new Date().getFullYear();
  let nextNum = 1;
  if (maxInvoiceNumber) {
    const match = maxInvoiceNumber.match(/-(\d{3,})$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  return `INV-${currentYear}-${String(nextNum).padStart(3, "0")}`;
}
