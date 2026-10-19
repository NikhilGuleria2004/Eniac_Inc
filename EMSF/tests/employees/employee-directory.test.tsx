import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockEmployees } from "@/data/mock/index";
import { EmployeeDirectoryPage } from "@/features/employees/EmployeeDirectoryPage";
import type { Employee } from "@/types";

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ user: { role: "HR", employeeId: "hr-1" } }),
}));
vi.mock("@/lib/permissions", () => ({
  hasPermission: () => true,
}));
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ addToast: vi.fn(), removeToast: vi.fn() }),
}));
vi.mock("@/data/mock/repositories", () => ({
  getEmployees: () => mockEmployees,
  getProjects: () => [],
  getAssignmentsByEmployee: () => [],
  deleteEmployee: vi.fn(),
}));

const base = (overrides: Partial<Employee>): Employee =>
  ({
    id: "emp-1",
    employeeCode: "EMP-001",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "+1 555-0001",
    designation: "Engineer",
    department: "Engineering",
    country: "India",
    city: "Pune",
    employmentStatus: "ACTIVE",
    employmentType: "FULL_TIME",
    billingStatus: "BILLABLE",
    joiningDate: "2026-01-01",
    managerId: undefined,
    supervisorId: undefined,
    timesheetEligibility: "NOT_ELIGIBLE",
    role: "HR",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }) as Employee;

beforeEach(() => {
  mockEmployees.length = 0;
  mockEmployees.push(
    base({ id: "emp-1", employeeCode: "EMP-001", firstName: "Jane", lastName: "Doe", email: "jane@example.com" }),
    // The backend schema marks `designation` optional (EMSB schemas:employee.schemas:20),
    // so a real loaded employee can have designation === undefined. The directory's
    // search predicate called `.toLowerCase()` on it directly, which threw a TypeError
    // on the first keystroke and made the search bar un-typeable.
    base({
      id: "emp-2",
      employeeCode: "EMP-002",
      firstName: "Sam",
      lastName: "Smith",
      email: "sam@example.com",
      designation: undefined,
    }),
  );
});

afterEach(() => {
  cleanup();
  mockEmployees.length = 0;
});

describe("EmployeeDirectoryPage search bar", () => {
  it("renders all employees initially", () => {
    render(
      <MemoryRouter>
        <EmployeeDirectoryPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Sam Smith")).toBeInTheDocument();
  });

  it("does not crash and filters when an employee has no designation", async () => {
    render(
      <MemoryRouter>
        <EmployeeDirectoryPage />
      </MemoryRouter>,
    );

    const search = document.querySelector('input[placeholder="Search by name, email, code, designation…"]') as HTMLInputElement;
    fireEvent.change(search, { target: { value: "sam" } });

    await waitFor(() => expect(search.value).toBe("sam"));
    expect(screen.getByText("Sam Smith")).toBeInTheDocument();
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
  });
});
