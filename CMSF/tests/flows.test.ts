import { describe, it, expect, beforeEach } from "vitest";
import {
  createTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  reviseTimesheet,
  markPaidTimesheet,
  getTimesheetById,
} from "../src/data/mock/repositories";

describe("timesheet repository flow (integration)", () => {
  let id = "";

  beforeEach(() => {
    const ts = createTimesheet({ employeeId: "EMP-005", periodStart: "2026-02-01", periodEnd: "2026-02-15", status: "DRAFT" });
    id = ts.id;
  });

  it("walks DRAFT → SUBMITTED → APPROVED → PAID", () => {
    expect(getTimesheetById(id)?.status).toBe("DRAFT");
    const submitted = submitTimesheet(id, "EMP-005");
    expect(submitted?.status).toBe("SUBMITTED");
    expect(submitted?.submittedBy).toBe("EMP-005");
    const approved = approveTimesheet(id, "Manager User", "Looks good");
    expect(approved?.status).toBe("APPROVED");
    expect(approved?.reviewedBy).toBe("Manager User");
    const paid = markPaidTimesheet(id);
    expect(paid?.status).toBe("PAID");
    expect(paid?.paidAt).toBeTruthy();
  });

  it("walks REJECTED → REVISED → SUBMITTED", () => {
    submitTimesheet(id, "EMP-005");
    const rejected = rejectTimesheet(id, "Manager User", "Missing detail");
    expect(rejected?.status).toBe("REJECTED");
    expect(rejected?.reviewNotes).toBe("Missing detail");
    const revised = reviseTimesheet(id);
    expect(revised?.status).toBe("REVISED");
    const resubmitted = submitTimesheet(id, "EMP-005");
    expect(resubmitted?.status).toBe("SUBMITTED");
  });

  it("blocks illegal transitions", () => {
    expect(markPaidTimesheet(id)).toBeUndefined();
    expect(approveTimesheet(id, "M")).toBeUndefined();
    expect(reviseTimesheet(id)).toBeUndefined();
    expect(submitTimesheet(id, "E")?.status).toBe("SUBMITTED");
    expect(submitTimesheet(id, "E")).toBeUndefined();
  });
});
