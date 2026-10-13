import type { Employee } from "../../../types";
import { StatusBadge } from "../../../components/data/StatusBadge";

export function EmploymentTab({ employee }: { employee: Employee }) {
  const rows: [string, string][] = [
    ["Employee Code", employee.employeeCode],
    ["Designation", employee.designation],
    ["Department", employee.department],
    ["Employment Type", employee.employmentType.replace(/_/g, " ")],
    ["Joining Date", employee.joiningDate],
    ["System Role", employee.role],
  ];
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Employment Details</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="border border-gray-100 rounded-md p-3">
            <dt className="text-xs text-gray-500">{k}</dt>
            <dd className="text-gray-900 font-medium mt-1">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className="text-gray-500">Status:</span>
        <StatusBadge status={employee.employmentStatus} />
      </div>
    </div>
  );
}
