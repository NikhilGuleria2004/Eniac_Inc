import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import {
  getBillableEmployees,
  getActiveAssignmentsByEmployee,
  createAssignment,
} from "../../data/mock/repositories";
import { TECH_ROLES } from "../../data/constants";
import type { TechRole, ProjectAssignment } from "../../types";

interface AssignmentModalProps {
  open: boolean;
  projectId: string;
  onClose: () => void;
}

export function AssignmentModal({ open, projectId, onClose }: AssignmentModalProps) {
  const { addToast } = useToast();
  const billable = useMemo(() => getBillableEmployees(), [open]);

  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState<TechRole>("Java Developer");
  const [allocation, setAllocation] = useState(100);
  const [billableFlag, setBillableFlag] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<ProjectAssignment["status"]>("ACTIVE");

  useEffect(() => {
    if (open) {
      const first = billable[0];
      setEmployeeId(first?.id ?? "");
      setRole((first?.techRole as TechRole) ?? "Java Developer");
      setAllocation(100);
      setBillableFlag(true);
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate("");
      setStatus("ACTIVE");
    }
  }, [open, billable]);

  const existingAllocation = employeeId
    ? getActiveAssignmentsByEmployee(employeeId).reduce((s, a) => s + a.allocation, 0)
    : 0;
  const totalAllocation = existingAllocation + allocation;
  const overallocated = totalAllocation > 100;

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const emp = billable.find((e) => e.id === id);
    if (emp?.techRole) setRole(emp.techRole as TechRole);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (overallocated) {
      addToast("warning", `Allocation would reach ${totalAllocation}% for this employee`);
      return;
    }
    const emp = billable.find((x) => x.id === employeeId);
    createAssignment({
      employeeId,
      projectId,
      role: (emp?.techRole as TechRole) ?? role,
      allocation,
      billable: billableFlag,
      startDate,
      endDate: endDate || undefined,
      status,
      assignedBy: "EMP-001",
    });
    addToast("success", "Team member assigned");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Team Member"
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="assignment-form" className="btn btn-primary" disabled={!employeeId}>Assign</button>
        </>
      }
    >
      <form id="assignment-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Employee *</label>
          <Select value={employeeId} onChange={(e) => handleEmployeeChange(e.target.value)} required>
            {billable.map((e) => (
              <option key={e.id} value={e.id}>{`${e.firstName} ${e.lastName} — ${e.employeeCode} (${e.techRole ?? e.designation})`}</option>
            ))}
          </Select>
          <p className="text-xs text-gray-500 mt-1">Filtered to active billable employees.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Role on Project</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as TechRole)}>
              {TECH_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Allocation %</label>
            <Input type="number" min={0} max={100} value={allocation} onChange={(e) => setAllocation(Number(e.target.value))} required />
            {existingAllocation > 0 && (
              <p className={`text-xs mt-1 ${overallocated ? "text-danger" : "text-gray-500"}`}>
                Already at {existingAllocation}% → new total {totalAllocation}%
                {overallocated && " (exceeds 100%)"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input id="billable" type="checkbox" checked={billableFlag} onChange={(e) => setBillableFlag(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
            <label htmlFor="billable" className="text-sm text-gray-700">Billable (default on for CMS)</label>
          </div>
          <div>
            <label className="form-label">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectAssignment["status"])}>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="ENDED">Ended</option>
            </Select>
          </div>
          <div>
            <label className="form-label">Start Date *</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}
