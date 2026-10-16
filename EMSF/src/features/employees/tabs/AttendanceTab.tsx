import type { Employee } from "../../../types";
import { getAttendanceByEmployee } from "../../../data/mock/repositories";
import { StatusBadge } from "../../../components/data/StatusBadge";

export function AttendanceTab({ employee }: { employee: Employee }) {
  const records = getAttendanceByEmployee(employee.id).slice(0, 10);
  const present = getAttendanceByEmployee(employee.id).filter((a) => a.status === "PRESENT").length;
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Attendance</h3>
      <p className="text-xs text-gray-500 mb-4">
        {present} present day(s) on record. Showing latest {records.length} record(s).
      </p>
      {records.length === 0 ? (
        <p className="text-sm text-gray-500">No attendance records.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Date</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Check In</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Check Out</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Hours</th>
                <th scope="col" className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((a) => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-900">{a.date}</td>
                  <td className="py-2 px-3 text-gray-600">{a.checkIn ?? "—"}</td>
                  <td className="py-2 px-3 text-gray-600">{a.checkOut ?? "—"}</td>
                  <td className="py-2 px-3 text-gray-600">{a.workingHours ?? "—"}</td>
                  <td className="py-2 px-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
