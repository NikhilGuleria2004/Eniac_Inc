import { describe, it, expect } from "vitest";
import { getCurrentBillingPeriod, getPreviousBillingPeriods, getBillingPeriodsForMonth } from "../src/lib/utils";

describe("billing periods", () => {
  it("period 1 is the 1st-15th", () => {
    const p = getCurrentBillingPeriod(new Date("2026-10-01T12:00:00"));
    expect(p.period).toBe(1);
    expect(p.start).toBe("2026-10-01");
    expect(p.end).toBe("2026-10-15");
  });

  it("period 2 is the 16th-last day", () => {
    const p = getCurrentBillingPeriod(new Date("2026-10-20T12:00:00"));
    expect(p.period).toBe(2);
    expect(p.start).toBe("2026-10-16");
    expect(p.end).toBe("2026-10-31");
  });

  it("respects February (28/29) and 30-day months", () => {
    expect(getBillingPeriodsForMonth(2026, 1).period2.end).toBe("2026-02-28");
    expect(getBillingPeriodsForMonth(2028, 1).period2.end).toBe("2028-02-29");
    expect(getBillingPeriodsForMonth(2026, 3).period2.end).toBe("2026-04-30");
  });

  it("returns previous periods newest-first", () => {
    const list = getPreviousBillingPeriods(4, new Date("2026-10-20T12:00:00"));
    expect(list).toHaveLength(4);
    expect(list[0].start).toBe("2026-10-16");
    expect(list[1].start).toBe("2026-10-01");
    expect(list[2].start).toBe("2026-09-16");
    expect(list.every((p, i) => i === 0 || list[i - 1].start > p.start)).toBe(true);
  });
});
