import type { Employee } from "../../../types";

export function GeographyTab({ employee }: { employee: Employee }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Geography</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="border border-gray-100 rounded-md p-3">
          <dt className="text-xs text-gray-500">Country</dt>
          <dd className="text-gray-900 font-medium mt-1">{employee.country}</dd>
        </div>
        <div className="border border-gray-100 rounded-md p-3">
          <dt className="text-xs text-gray-500">State</dt>
          <dd className="text-gray-900 font-medium mt-1">{employee.state ?? "—"}</dd>
        </div>
        <div className="border border-gray-100 rounded-md p-3">
          <dt className="text-xs text-gray-500">City</dt>
          <dd className="text-gray-900 font-medium mt-1">{employee.city}</dd>
        </div>
        <div className="border border-gray-100 rounded-md p-3">
          <dt className="text-xs text-gray-500">Work Region</dt>
          <dd className="text-gray-900 font-medium mt-1">
            {employee.country === "India" ? "India (IST)" : "United States"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
