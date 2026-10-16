import { useUrlState } from "../../lib/useUrlState";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, CalendarDays, PlusCircle } from "lucide-react";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatCard } from "../../components/data/StatCard";
import { Alert } from "../../components/ui/Alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { ROUTES } from "../../data/constants";
import { getLeaveRequests, decideLeaveRequest } from "../../data/mock/repositories";
import { useAuth } from "../auth/AuthContext";
import {
  getLeaveKpis,
  getToday,
  scopeLeaveForRole,
  canApproveLeave,
} from "./leave";
import { RequestsTab } from "./tabs/RequestsTab";
import { BalancesTab } from "./tabs/BalancesTab";
import type { LeaveRequest } from "../../types";

type Flash = { type: "success" | "error"; message: string } | null;

/** §47 Leave Management: KPI row + requests table + balances. */
export function LeaveDashboardPage() {
  const [tab, setTab] = useUrlState("tab", "requests");

  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const userId = user?.id ?? "";
  const location = useLocation();
  const [version, setVersion] = useState(0);
  const incomingFlash = (location.state as { flash?: string } | null)?.flash;
  const [flash, setFlash] = useState<Flash>(
    incomingFlash ? { type: "success", message: incomingFlash } : null,
  );

  const today = useMemo(() => getToday(), []);
  const allRequests = useMemo(() => getLeaveRequests(), [version]);
  const requests = useMemo(
    () => scopeLeaveForRole(allRequests, role, userId),
    [allRequests, role, userId],
  );
  const kpis = useMemo(() => getLeaveKpis(requests, today), [requests, today]);
  const canApprove = canApproveLeave(role);

  const handleDecide = async (
    request: LeaveRequest,
    decision: "APPROVED" | "REJECTED",
    comment: string,
  ) => {
    const updated = await decideLeaveRequest(request.id, decision, comment);
    if (updated) {
      setFlash({
        type: "success",
        message: `Leave request ${updated.status.toLowerCase()} for ${request.startDate} → ${request.endDate}.`,
      });
    } else {
      setFlash({ type: "error", message: "Failed to process leave request." });
    }
    setVersion((v) => v + 1);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Leave Management"
        description={`Requests, balances and approvals — ${today}`}
        actions={
          <Link to={ROUTES.LEAVE_REQUEST} className="btn btn-primary">
            <PlusCircle aria-hidden="true" size={16} className="mr-1.5" />
            Request Leave
          </Link>
        }
      />

      {flash && (
        <Alert variant={flash.type} className="mb-4">
          {flash.message}
        </Alert>
      )}

      {/* §47 KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={kpis.pending} icon={<Clock aria-hidden="true" size={20} />} />
        <StatCard label="Approved" value={kpis.approved} icon={<CheckCircle2 aria-hidden="true" size={20} />} />
        <StatCard label="Rejected" value={kpis.rejected} icon={<XCircle aria-hidden="true" size={20} />} />
        <StatCard label="On Leave Today" value={kpis.onLeaveToday} icon={<CalendarDays aria-hidden="true" size={20} />} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <RequestsTab requests={requests} canApprove={canApprove} onDecide={handleDecide} />
        </TabsContent>
        <TabsContent value="balances">
          <BalancesTab requests={requests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
