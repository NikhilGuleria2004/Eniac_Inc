import { useState } from "react";
import { AttendanceCalendar } from "../AttendanceCalendar";
import { getToday } from "../attendance";
import { getEmployees } from "../../../data/mock/repositories";
import { Select } from "../../../components/ui/Select";
import type { Attendance, Role } from "../../../types";

interface CalendarTabProps {
  records: Attendance[]; // already scoped to the role
  role: Role;
}

/** §45 Attendance Calendar tab: month grid with employee filter. */
export function CalendarTab({ records, role }: CalendarTabProps) {
  const today = getToday();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [employeeId, setEmployeeId] = useState("ALL");

  const employees = getEmployees();
  const filtered =
    employeeId === "ALL" ? records : records.filter((r) => r.employeeId === employeeId);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="space-y-4">
      {role !== "EMPLOYEE" && (
        <div className="flex items-center gap-2">
          <label htmlFor="calendar-employee" className="text-sm font-medium text-gray-700">
            Employee
          </label>
          <Select
            id="calendar-employee"
            className="w-64"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="ALL">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </Select>
        </div>
      )}
      <AttendanceCalendar
        year={year}
        month={month}
        records={filtered}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
      />
    </div>
  );
}
