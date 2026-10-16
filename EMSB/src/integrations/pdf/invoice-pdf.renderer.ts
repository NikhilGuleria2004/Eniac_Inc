import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import {
  PAGE,
  COLORS,
  HEADER,
  BILL_TO,
  META,
  SUBJECT,
  TABLE,
  TOTALS,
  SECTIONS,
  FOOTER,
  PAGINATION
} from "./layout.js";

const FONT_REGULAR = "OpenSans";
const FONT_BOLD = "OpenSans-Bold";

const REGULAR_FONT_PATH = fileURLToPath(new URL("./fonts/OpenSans-Regular.ttf", import.meta.url));
const BOLD_FONT_PATH = fileURLToPath(new URL("./fonts/OpenSans-Bold.ttf", import.meta.url));

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "\u20B9",
  EUR: "\u20AC",
  GBP: "\u00A3",
  CAD: "C$"
};

export interface InvoicePdfLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

/**
 * Plain view-model consumed by the renderer. Assembled by `InvoicePdfService`
 * from the stored invoice, so the renderer never touches the database.
 */
export interface InvoicePdfModel {
  invoiceNumber: string;
  subject: string;
  /** ISO date (YYYY-MM-DD). */
  issueDate: string;
  /** ISO date (YYYY-MM-DD). */
  dueDate: string;
  /** Pre-humanized payment terms, e.g. "Due on Receipt", "Net 30". */
  paymentTermsLabel: string;
  poNumber?: string;
  currency: string;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  balanceDue: number;
  lineItems: InvoicePdfLineItem[];
  notes?: string;
  termsAndConditions?: string;
  paymentInstructions?: string;
  client: { name: string; addressLines: string[] };
  org: { name: string; addressLines: string[]; email: string };
}

/** Optional branding sourced from the default invoice template. */
export interface InvoicePdfBranding {
  /** Table header fill, e.g. "#1D4ED8". Falls back to the reference charcoal. */
  primaryColor?: string;
  /** Short footer note printed above the footer rule. */
  footerNote?: string;
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatNumber(value: number): string {
  return numberFormatter.format(Number.isFinite(value) ? value : 0);
}

/** Formats an amount with its currency symbol, e.g. "$70,460.00". */
export function formatInvoicePdfMoney(value: number, currency: string): string {
  const formatted = formatNumber(value);
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${formatted}`;
}

function formatMoney(value: number, currency: string, withSymbol: boolean): string {
  const formatted = formatNumber(value);
  if (!withSymbol) return formatted;
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${formatted}`;
}

/** Renders "2026-07-01" as "01 Jul 2026", matching the reference document. */
export function formatInvoicePdfDate(isoDate: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function isValidHexColor(value: string | undefined): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

type Doc = InstanceType<typeof PDFDocument>;

/** Draws a single line left-aligned at (x, y). */
function left(doc: Doc, text: string, x: number, y: number, size: number, bold: boolean, color: string): void {
  doc
    .font(bold ? FONT_BOLD : FONT_REGULAR)
    .fontSize(size)
    .fillColor(color)
    .text(text, x, y, { lineBreak: false });
}

/** Draws a single line right-aligned so it ends at `rightX`. */
function right(doc: Doc, text: string, rightX: number, y: number, size: number, bold: boolean, color: string): void {
  doc
    .font(bold ? FONT_BOLD : FONT_REGULAR)
    .fontSize(size)
    .fillColor(color)
    .text(text, 0, y, { width: rightX, align: "right", lineBreak: false });
}

function fillRect(doc: Doc, x: number, y: number, width: number, height: number, color: string): void {
  doc.save().rect(x, y, width, height).fill(color).restore();
}

function drawHeader(doc: Doc, model: InvoicePdfModel): void {
  left(doc, model.org.name, HEADER.orgName.x, HEADER.orgName.y, HEADER.orgName.size, true, COLORS.text);
  let y = HEADER.orgLineStart;
  for (const line of model.org.addressLines) {
    left(doc, line, HEADER.orgName.x, y, HEADER.orgLineSize, false, COLORS.text);
    y += HEADER.orgLineStep;
  }
  left(doc, model.org.email, HEADER.orgName.x, y, HEADER.orgLineSize, false, COLORS.text);

  right(doc, "INVOICE", HEADER.title.right, HEADER.title.y, HEADER.title.size, false, COLORS.black);
  right(doc, `# ${model.invoiceNumber}`, HEADER.number.right, HEADER.number.y, HEADER.number.size, true, COLORS.text);
  right(doc, "Balance Due", HEADER.balanceLabel.right, HEADER.balanceLabel.y, HEADER.balanceLabel.size, true, COLORS.text);
  right(
    doc,
    formatMoney(model.balanceDue, model.currency, true),
    HEADER.balanceAmount.right,
    HEADER.balanceAmount.y,
    HEADER.balanceAmount.size,
    true,
    COLORS.black
  );
}

function drawBillToAndMeta(doc: Doc, model: InvoicePdfModel): void {
  left(doc, "Bill To", BILL_TO.label.x, BILL_TO.label.y, BILL_TO.label.size, false, COLORS.text);
  left(doc, model.client.name, BILL_TO.name.x, BILL_TO.name.y, BILL_TO.name.size, true, COLORS.text);
  let y = BILL_TO.lineStart;
  for (const line of model.client.addressLines) {
    left(doc, line, BILL_TO.name.x, y, BILL_TO.lineSize, false, COLORS.text);
    y += BILL_TO.lineStep;
  }

  const rows: Array<[string, string]> = [
    ["Invoice Date :", formatInvoicePdfDate(model.issueDate)],
    ["Terms :", model.paymentTermsLabel],
    ["Due Date :", formatInvoicePdfDate(model.dueDate)]
  ];
  if (model.poNumber) rows.push(["P.O.# :", model.poNumber]);
  rows.forEach(([label, value], i) => {
    const rowY = META.firstRowTop + i * META.rowStep;
    right(doc, label, META.labelRight, rowY, META.labelSize, false, COLORS.text);
    right(doc, value, META.valueRight, rowY, META.valueSize, false, COLORS.text);
  });

  left(doc, "Subject :", SUBJECT.x, SUBJECT.labelY, SUBJECT.size, false, COLORS.text);
  left(doc, model.subject, SUBJECT.x, SUBJECT.valueY, SUBJECT.size, false, COLORS.text);
}

function drawTableHeader(doc: Doc, top: number, headerFill: string): void {
  fillRect(doc, TABLE.columns.index.left, top, TABLE.columns.amount.right - TABLE.columns.index.left, TABLE.headerHeight, headerFill);
  const textY = top + TABLE.headerTextTop;
  const col = TABLE.columns;
  left(doc, "#", col.index.left + TABLE.indexInset, textY, 9, false, COLORS.white);
  left(doc, "Item & Description", col.description.left + TABLE.descriptionInset, textY, 9, false, COLORS.white);
  right(doc, "Qty", col.quantity.right - TABLE.numericInset, textY, 9, false, COLORS.white);
  right(doc, "Rate", col.rate.right - TABLE.numericInset, textY, 9, false, COLORS.white);
  right(doc, "Amount", col.amount.right - TABLE.numericInset, textY, 9, false, COLORS.white);
}

function drawTableRow(doc: Doc, index: number, item: InvoicePdfLineItem, top: number): void {
  const textY = top + TABLE.rowTextTop;
  const col = TABLE.columns;
  left(doc, String(index), col.index.left + TABLE.indexInset, textY, 9, false, COLORS.black);
  left(doc, item.description, col.description.left + TABLE.descriptionInset, textY, 9, false, COLORS.description);
  right(doc, formatNumber(item.quantity), col.quantity.right - TABLE.numericInset, textY, 9, false, COLORS.black);
  right(doc, formatNumber(item.rate), col.rate.right - TABLE.numericInset, textY, 9, false, COLORS.black);
  right(doc, formatNumber(item.amount), col.amount.right - TABLE.numericInset, textY, 9, false, COLORS.black);
  // Separator rule below the row.
  fillRect(
    doc,
    col.index.left,
    top + TABLE.rowHeight - TABLE.ruleHeight,
    TABLE.columns.amount.right - col.index.left,
    TABLE.ruleHeight,
    COLORS.rule
  );
}

function drawTotals(doc: Doc, model: InvoicePdfModel, lastRowBottom: number): number {
  let y = lastRowBottom + TOTALS.subtotalTopOffset;
  right(doc, "Sub Total", TOTALS.labelRight, y, TOTALS.size, false, COLORS.black);
  right(doc, formatMoney(model.subtotal, model.currency, false), TOTALS.valueRight, y, TOTALS.size, false, COLORS.black);

  if (model.taxRate > 0) {
    y += TOTALS.rowStep;
    right(doc, `Tax (${formatNumber(model.taxRate)}%)`, TOTALS.labelRight, y, TOTALS.size, false, COLORS.black);
    right(doc, formatMoney(model.taxAmount, model.currency, false), TOTALS.valueRight, y, TOTALS.size, false, COLORS.black);
  }

  y += TOTALS.rowStep;
  right(doc, "Total", TOTALS.labelRight, y, TOTALS.size, true, COLORS.black);
  right(doc, formatMoney(model.totalAmount, model.currency, true), TOTALS.valueRight, y, TOTALS.size, true, COLORS.black);

  const bandTop = y + TOTALS.bandTopOffset;
  fillRect(doc, TOTALS.band.left, bandTop, TOTALS.band.width, TOTALS.band.height, COLORS.bandFill);
  const balanceY = bandTop + TOTALS.bandTextOffset;
  right(doc, "Balance Due", TOTALS.labelRight, balanceY, TOTALS.size, true, COLORS.black);
  right(doc, formatMoney(model.balanceDue, model.currency, true), TOTALS.valueRight, balanceY, TOTALS.size, true, COLORS.black);
  return bandTop + TOTALS.band.height;
}

function drawSection(doc: Doc, title: string, body: string, top: number): number {
  left(doc, title, 45.6, top, SECTIONS.titleSize, false, COLORS.text);
  doc.font(FONT_REGULAR).fontSize(SECTIONS.bodySize).fillColor(COLORS.text);
  doc.text(body, 45.6, top + SECTIONS.titleToBody, { width: 515 });
  return doc.y;
}

/**
 * Renders an invoice to an A4 PDF buffer in the style of the reference
 * document (`INV-000001.pdf`): charcoal table header, gray item descriptions,
 * right-aligned meta/totals, and a tinted balance-due band. Line items
 * paginate across pages with the table header repeated on each page.
 */
export async function renderInvoicePdf(model: InvoicePdfModel, branding?: InvoicePdfBranding): Promise<Buffer> {
  const doc = new PDFDocument({
    size: [PAGE.width, PAGE.height],
    margin: 0,
    // Buffer all pages so the footer pass can revisit every page via switchToPage.
    bufferPages: true,
    info: {
      Title: `Invoice ${model.invoiceNumber}`,
      Author: model.org.name,
      Subject: model.subject,
      Creator: "Eniac Inc. Invoice PDF Service",
      Producer: "pdfkit"
    }
  });

  doc.registerFont(FONT_REGULAR, REGULAR_FONT_PATH);
  doc.registerFont(FONT_BOLD, BOLD_FONT_PATH);

  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const headerFill = isValidHexColor(branding?.primaryColor) ? branding.primaryColor : COLORS.headerFill;

  drawHeader(doc, model);
  drawBillToAndMeta(doc, model);

  // ── Line-item table with pagination ──────────────────────────────────────
  // Line items keep the invoice's stored order (sortOrder assigned upstream).
  const items = model.lineItems;
  let index = 0;
  let tableTop: number = TABLE.headerTop;
  let lastRowBottom = tableTop + TABLE.headerHeight;

  drawTableHeader(doc, tableTop, headerFill);
  while (index < items.length) {
    let rowTop = lastRowBottom;
    const rowsOnPage = index === 0 ? PAGINATION.rowsFirstPage : PAGINATION.rowsContinuationPage;
    const rowLimit = Math.min(rowsOnPage, items.length - index);
    for (let row = 0; row < rowLimit; row++) {
      drawTableRow(doc, index + 1, items[index], rowTop);
      rowTop += TABLE.rowHeight;
      index++;
    }
    lastRowBottom = rowTop;

    if (index < items.length) {
      doc.addPage();
      left(doc, `Invoice #${model.invoiceNumber}`, 45.6, PAGINATION.continuationIdentTop, 9, true, COLORS.text);
      right(doc, `(continued) - ${model.client.name}`, 560.6, PAGINATION.continuationIdentTop, 9, false, COLORS.text);
      tableTop = PAGINATION.continuationHeaderTop;
      drawTableHeader(doc, tableTop, headerFill);
      lastRowBottom = tableTop + TABLE.headerHeight;
    }
  }

  // ── Totals, notes and terms ──────────────────────────────────────────────
  const bandBottom = drawTotals(doc, model, lastRowBottom);
  let y = bandBottom + SECTIONS.titleTopOffset;
  if (model.notes) {
    y = drawSection(doc, "Notes", model.notes, y) + SECTIONS.sectionGap;
  }
  if (model.termsAndConditions) {
    y = drawSection(doc, "Terms & Conditions", model.termsAndConditions, y) + SECTIONS.sectionGap;
  }
  if (model.paymentInstructions) {
    drawSection(doc, "Payment Instructions", model.paymentInstructions, y);
  }

  // ── Footer (every page) ──────────────────────────────────────────────────
  const totalPages = doc.bufferedPageRange().count;
  for (let page = 1; page <= totalPages; page++) {
    doc.switchToPage(page - 1);
    if (branding?.footerNote) {
      left(doc, branding.footerNote, FOOTER.note.left, FOOTER.note.y, FOOTER.note.size, false, COLORS.footerNumber);
    }
    fillRect(doc, FOOTER.rule.left, FOOTER.rule.y, FOOTER.rule.right - FOOTER.rule.left, FOOTER.rule.height, COLORS.rule);
    right(doc, String(page), FOOTER.number.right, FOOTER.number.y, FOOTER.number.size, false, COLORS.footerNumber);
  }

  doc.end();
  return bufferPromise;
}


