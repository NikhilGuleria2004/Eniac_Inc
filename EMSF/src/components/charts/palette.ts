/**
 * Single source of truth for chart colors.
 *
 * Hues come from the Okabe–Ito color-blind-safe palette so slices, bars, and
 * lines stay distinguishable for deuteranopia, protanopia, and tritanopia, and
 * every hue is bright enough to read on both the light and dark surfaces.
 * Charts always pair these with text labels (legend/tooltip) so color is never
 * the only cue.
 */

/** Okabe–Ito hues, tuned for contrast on light and true-black surfaces. */
export const CHART_HUE = {
  blue: "#0072B2",
  skyBlue: "#56B4E9",
  bluishGreen: "#009E73",
  orange: "#E69F00",
  vermillion: "#D55E00",
  reddishPurple: "#CC79A7",
  gray: "#8A8F98",
} as const;

/** Employment lifecycle statuses. */
export const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: CHART_HUE.bluishGreen,
  ON_LEAVE: CHART_HUE.orange,
  ONBOARDING: CHART_HUE.blue,
  INACTIVE: CHART_HUE.gray,
  SUSPENDED: CHART_HUE.reddishPurple,
  RESIGNED: CHART_HUE.skyBlue,
  TERMINATED: CHART_HUE.vermillion,
};

/** Project lifecycle statuses. */
export const PROJECT_STATUS_COLORS: Record<string, string> = {
  PLANNING: CHART_HUE.blue,
  ACTIVE: CHART_HUE.bluishGreen,
  ON_HOLD: CHART_HUE.orange,
  COMPLETED: CHART_HUE.skyBlue,
  CANCELLED: CHART_HUE.gray,
};

/** Project health signals. */
export const PROJECT_HEALTH_COLORS: Record<string, string> = {
  ON_TRACK: CHART_HUE.bluishGreen,
  AT_RISK: CHART_HUE.orange,
  DELAYED: CHART_HUE.vermillion,
  COMPLETED: CHART_HUE.skyBlue,
  PLANNING: CHART_HUE.blue,
  ON_HOLD: CHART_HUE.reddishPurple,
  ACTIVE: CHART_HUE.bluishGreen,
  CANCELLED: CHART_HUE.gray,
};

/** Leave request statuses. */
export const LEAVE_STATUS_COLORS: Record<string, string> = {
  PENDING: CHART_HUE.orange,
  APPROVED: CHART_HUE.bluishGreen,
  REJECTED: CHART_HUE.vermillion,
  CANCELLED: CHART_HUE.gray,
};

/** Leave categories (categorical, not status-based). */
export const LEAVE_TYPE_COLORS: Record<string, string> = {
  PAID: CHART_HUE.blue,
  SICK: CHART_HUE.vermillion,
  CASUAL: CHART_HUE.orange,
  UNPAID: CHART_HUE.gray,
};

/** Document review statuses. */
export const DOCUMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: CHART_HUE.orange,
  UNDER_REVIEW: CHART_HUE.blue,
  APPROVED: CHART_HUE.bluishGreen,
  REJECTED: CHART_HUE.vermillion,
  EXPIRED: CHART_HUE.reddishPurple,
};

/** Project assignment statuses. */
export const ASSIGNMENT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: CHART_HUE.bluishGreen,
  ENDED: CHART_HUE.gray,
  PENDING: CHART_HUE.orange,
};

/** Workforce trend lines. */
export const WORKFORCE_LINE_COLORS = {
  headcount: CHART_HUE.blue,
  newHires: CHART_HUE.bluishGreen,
  exits: CHART_HUE.vermillion,
} as const;

/** Ordered hues for sequential/ordinal series (pipeline stages, trends). */
export const CHART_SERIES_COLORS: string[] = [
  CHART_HUE.blue,
  CHART_HUE.skyBlue,
  CHART_HUE.orange,
  CHART_HUE.reddishPurple,
  CHART_HUE.bluishGreen,
  CHART_HUE.gray,
];

/** Fallback for any status not covered above. */
export const CHART_FALLBACK_COLOR = CHART_HUE.gray;
