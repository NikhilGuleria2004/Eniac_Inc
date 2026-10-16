import { useUrlState } from "../../lib/useUrlState";
import { useMemo, useState } from "react";
import { UserCheck, UserX, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/data/StatCard";
import { Alert } from "../../components/ui/Alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { useAuth } from "../auth/AuthContext";
import {
  getToday,
  getTodayKpis,
  getExceptions,
  scopeAttendanceForRole,
  canReviewCorrections,
} from "./attendance";
import { getAttendance, requestAttendanceCorrection, reviewAttendanceCorrection } from "../../data/mock/repositories";
import { TodayTab } from "./tabs/TodayTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { EmployeesTab } from "./tabs/EmployeesTab";
import { ExceptionsTab } from "./tabs/ExceptionsTab";
import { ReportsTab } from "./tabs/ReportsTab";
import type { Attendance } from "../../types";

type Flash = { type: "success" | "error"; message: string } | null;

export function AttendanceDashboardPage() {
  const [tab, setTab] = useUrlState("tab", "today");

  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const userId = user?.id ?? "";
  const [version, setVersion] = useState(0);
  const [flash, setFlash] = useState<Flash>(null);

  const today = useMemo(() => getToday(), []);
  const allRecords = useMemo(() => getAttendance(), [version]);
  const records = useMemo(
    () => scopeAttendanceForRole(allRecords, role, userId),
    [allRecords, role, userId],
  );
  const kpis = useMemo(() => getTodayKpis(records, today), [records, today]);
  const todayRecords = useMemo(
    () => records.filter((r) => r.date === today),
    [records, today],
  );
  const exceptions = useMemo(() => getExceptions(records), [records]);

  const handleRequestCorrection = (record: Attendance) => {
    const updated = requestAttendanceCorrection(record.id);
    if (updated) {
      setFlash({ type: "success", message: `Correction requested for ${record.date}.` });
    } else {
      setFlash({ type: "error", message: "Could not request a correction for this record." });
    }
    setVersion((v) => v + 1);
  };

  const handleReviewCorrection = (
    record: Attendance,
    decision: "APPROVED" | "REJECTED",
    comment: string,
  ) => {
    const updated = reviewAttendanceCorrection(record.id, decision, comment);
    if (updated) {
      setFlash({
        type: "success",
        message: `Correction ${decision === "APPROVED" ? "approved" : "rejected"} for ${record.date}.`,
      });
    } else {
      setFlash({ type: "error", message: "No pending correction found for this record." });
    }
    setVersion((v) => v + 1);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Attendance Management"
        description={`Daily attendance, calendar, exceptions and corrections — ${today}`}
      />

      {flash && (
        <Alert variant={flash.type} className="mb-4">
          {flash.message}
        </Alert>
      )}

      {/* §44 KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Present Today" value={kpis.presentToday} icon={<UserCheck aria-hidden="true" size={20} />} />
        <StatCard label="Absent" value={kpis.absent} icon={<UserX aria-hidden="true" size={20} />} />
        <StatCard label="Late" value={kpis.late} icon={<Clock aria-hidden="true" size={20} />} />
        <StatCard label="On Leave" value={kpis.onLeave} icon={<CalendarDays aria-hidden="true" size={20} />} />
        <StatCard label="Missing Punches" value={kpis.missingPunches} icon={<AlertTriangle aria-hidden="true" size={20} />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="exceptions">
            Exceptions{exceptions.length > 0 ? ` (${exceptions.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <TodayTab
            records={todayRecords}
            role={role}
            userId={userId}
            onRequestCorrection={handleRequestCorrection}
          />
        </TabsContent>
        <TabsContent value="calendar">
          <CalendarTab records={records} role={role} />
        </TabsContent>
        <TabsContent value="employees">
          <EmployeesTab records={records} />
        </TabsContent>
        <TabsContent value="exceptions">
          <ExceptionsTab
            exceptions={exceptions}
            canReview={canReviewCorrections(role)}
            onReview={handleReviewCorrection}
          />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab records={records} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
