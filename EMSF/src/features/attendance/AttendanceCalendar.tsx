import { buildMonthGrid, statusLetter, ATTENDANCE_LEGEND, type CalendarDay } from "./attendance";
import type { Attendance } from "../../types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LETTER_STYLES: Record<string, string> = {
  P: "bg-green-100 text-green-700",
  A: "bg-red-100 text-red-700",
  L: "bg-amber-100 text-amber-700",
  LV: "bg-blue-100 text-blue-700",
  M: "bg-gray-200 text-gray-600",
};

interface AttendanceCalendarProps {
  year: number;
  month: number; // 0-based
  records: Attendance[];
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
}

/** §45 professional month grid with P/A/L/V/M legend. */
export function AttendanceCalendar({ year, month, records, onPrevMonth, onNextMonth }: AttendanceCalendarProps) {
  const weeks = buildMonthGrid(year, month, records);

  return (
    <div className="card min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {onPrevMonth && (
            <button type="button" onClick={onPrevMonth} className="btn btn-secondary px-2 py-1 text-xs shrink-0" aria-label="Previous month">
              ←
            </button>
          )}
          <h3 className="text-sm font-semibold text-gray-900 whitespace-nowrap">
            {MONTH_NAMES[month]} {year}
          </h3>
          {onNextMonth && (
            <button type="button" onClick={onNextMonth} className="btn btn-secondary px-2 py-1 text-xs shrink-0" aria-label="Next month">
              →
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ATTENDANCE_LEGEND.map((l) => (
            <span key={l.code} className="flex items-center gap-1 text-xs text-gray-600">
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded px-1 font-semibold ${LETTER_STYLES[l.code]}`}>
                {l.code}
              </span>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 border-b border-gray-200 pb-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-1 py-1 text-xs font-medium text-gray-500 uppercase">
            {d}
          </div>
        ))}
      </div>

      <div className="space-y-1 min-w-0">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {week.map((day: CalendarDay) => (
              <div
                key={day.date || `pad-${wi}-${day.day}`}
                className={`min-h-12 sm:min-h-16 rounded-md border p-0.5 sm:p-1 min-w-0 ${
                  day.inMonth ? "border-gray-200 bg-white" : "border-transparent bg-gray-50"
                }`}
              >
                {day.inMonth && (
                  <>
                    <div className="text-[11px] sm:text-xs font-medium text-gray-500">{day.day}</div>
                    <div className="mt-0.5 sm:mt-1 flex flex-wrap gap-0.5 sm:gap-1">
                      {day.letters.slice(0, 3).map((code) => (
                        <span
                          key={code}
                          title={`${code} — ${ATTENDANCE_LEGEND.find((l) => l.code === code)?.label} (${day.records.filter((r) => statusLetter(r.status) === code).length})`}
                          className={`inline-flex h-4 min-w-4 sm:h-5 sm:min-w-5 items-center justify-center rounded px-0.5 sm:px-1 text-[10px] sm:text-xs font-semibold ${LETTER_STYLES[code]}`}
                        >
                          {code}
                        </span>
                      ))}
                      {day.letters.length > 3 && (
                        <span className="text-[10px] sm:text-xs text-gray-400">+{day.letters.length - 3}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
