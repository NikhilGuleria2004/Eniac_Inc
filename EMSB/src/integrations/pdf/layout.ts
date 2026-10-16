// Layout constants for the invoice PDF, measured directly from the reference
// document (`INV-000001.pdf`, A4, produced with OpenPDF). All coordinates are
// in PDF points with the origin at the top-left of the page, and correspond to
// glyph-top positions (pdfkit `text(x, y)` uses the same convention, verified
// by calibration).

export const PAGE = {
  width: 595.42,
  height: 841.69
} as const;

/** Horizontal content bounds of the reference document. */
export const CONTENT = {
  left: 45.6,
  right: 560.6
} as const;

export const COLORS = {
  /** Body/label text color (#333333). */
  text: "#333333",
  /** Numeric table cells and totals. */
  black: "#000000",
  /** Table header band fill (#3C3D3A); overridable via the invoice template. */
  headerFill: "#3C3D3A",
  /** Row separator rules (#ADADAD). */
  rule: "#ADADAD",
  /** Item descriptions inside the table (#727272). */
  description: "#727272",
  /** Balance-due highlight band (#F5F4F3). */
  bandFill: "#F5F4F3",
  /** Page number in the footer (#6C718A). */
  footerNumber: "#6C718A",
  white: "#FFFFFF"
} as const;

/** Header block: sender identity (top-left) and title block (top-right). */
export const HEADER = {
  orgName: { x: 46.3, y: 60.2, size: 10 },
  orgLineStart: 73.3,
  orgLineStep: 11.9,
  orgLineSize: 9,
  title: { right: 560.6, y: 65.1, size: 28 },
  number: { right: 560.6, y: 97.2, size: 10 },
  balanceLabel: { right: 560.6, y: 126.1, size: 8 },
  balanceAmount: { right: 560.6, y: 138.3, size: 12 }
} as const;

/** "Bill To" block (left column). */
export const BILL_TO = {
  label: { x: 46.4, y: 187.8, size: 10 },
  name: { x: 46.4, y: 200.9, size: 9 },
  lineStart: 212.9,
  lineStep: 11.9,
  lineSize: 9
} as const;

/** Meta rows (Invoice Date / Terms / Due Date / P.O.#) in the right column. */
export const META = {
  labelRight: 450,
  valueRight: 560.6,
  firstRowTop: 181.6,
  rowStep: 20.75,
  labelSize: 10,
  valueSize: 9
} as const;

/** Subject row below "Bill To". */
export const SUBJECT = {
  x: 45.6,
  labelY: 276.2,
  valueY: 292.9,
  size: 9
} as const;

/** Line-item table geometry. */
export const TABLE = {
  headerTop: 318.3,
  headerHeight: 24,
  headerTextTop: 8.6,
  rowHeight: 27.6,
  rowTextTop: 10.1,
  /** Right-inset applied to right-aligned numeric cells. */
  numericInset: 7.5,
  /** Left inset of the "#" column. */
  indexInset: 12.2,
  /** Left inset of the description column. */
  descriptionInset: 15,
  /** Row separator rule height. */
  ruleHeight: 0.8,
  columns: {
    index: { left: 45.6, right: 71.3 },
    description: { left: 71.3, right: 370.1 },
    quantity: { left: 370.1, right: 426.8 },
    rate: { left: 426.8, right: 483.4 },
    amount: { left: 483.4, right: 560.6 }
  }
} as const;

/** Totals block below the table (Sub Total / [Tax] / Total / Balance Due). */
export const TOTALS = {
  /** Gap between the last table row and the Sub Total row. */
  subtotalTopOffset: 10.8,
  rowStep: 27.1,
  labelRight: 452,
  valueRight: 553.1,
  size: 9,
  band: { left: 303.1, width: 257.5, height: 30 },
  /** Gap between the Total row top and the Balance Due band top. */
  bandTopOffset: 17,
  /** Gap between the Balance Due glyph top and its band top. */
  bandTextOffset: 11.7
} as const;

/** Notes / Terms sections below the totals. */
export const SECTIONS = {
  /** Gap between the balance-due band bottom and the "Notes" title. */
  titleTopOffset: 40.4,
  titleSize: 10,
  titleToBody: 17.9,
  bodySize: 8,
  /** Gap between the end of one section body and the next title. */
  sectionGap: 24,
  wrapWidth: 515
} as const;

/** Footer: rule, page number and (template) footer note. */
export const FOOTER = {
  rule: { left: 39.6, right: 566.6, y: 791.3, height: 0.7 },
  number: { right: 566.6, y: 802.9, size: 8 },
  note: { left: 45.6, y: 768, size: 8 }
} as const;

/** Pagination budgets (row capacity per page). */
export const PAGINATION = {
  /** Do not draw table rows below this y on any page. */
  pageRowLimit: 745,
  /** Vertical space reserved on the final page for totals + notes + terms. */
  finalPageReserve: 190,
  /** Top of the repeated table header on continuation pages. */
  continuationHeaderTop: 56,
  /** Ident line above the table on continuation pages. */
  continuationIdentTop: 38,
  rowsFirstPage: 7,
  rowsContinuationPage: 17
} as const;
