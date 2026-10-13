import { EmployeeAvatar } from "../../../components/data/EmployeeAvatar";
import { StatusBadge } from "../../../components/data/StatusBadge";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../data/constants";
import type { Employee } from "../../../types";

interface EmployeeCardProps {
  employee: Employee;
  currentStage: string;
}

export function EmployeeCard({ employee, currentStage }: EmployeeCardProps) {
  const navigate = useNavigate();

  return (
    <div className="card mb-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <EmployeeAvatar
          firstName={employee.firstName}
          lastName={employee.lastName}
          avatar={employee.avatar}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 break-words min-w-0">
              {employee.firstName} {employee.lastName}
            </h2>
            <StatusBadge status={employee.employmentStatus} />
            <StatusBadge status={employee.billingStatus} />
          </div>
          <p className="text-sm text-gray-500 mt-1 break-words">
            {employee.designation} — {employee.department} — <span className="break-all">{employee.email}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5 break-words">
            Country: {employee.country} | Employee ID: {employee.employeeCode} | Onboarding Stage: {currentStage}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
          <button
            type="button"
            onClick={() => navigate(ROUTES.EMPLOYEE_EDIT(employee.id))}
            className="btn btn-secondary text-sm w-full sm:w-auto"
          >
            Edit Employee
          </button>
        </div>
      </div>
    </div>
  );
}
