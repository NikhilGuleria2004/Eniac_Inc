import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getEmployees, createTimesheet } from "../../data/mock/repositories";
import type { TimesheetStatus } from "../../types";

interface CreateTimesheetModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTimesheetModal({ open, onClose }: CreateTimesheetModalProps) {
  const { addToast } = useToast();
  const employees = useMemo(() => getEmployees(), [open]);

  const [employeeId, setEmployeeId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState<TimesheetStatus>("DRAFT");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setEmployeeId(employees[0]?.id ?? "");
      setStart(new Date().toISOString().slice(0, 10));
      setEnd(new Date().toISOString().slice(0, 10));
      setStatus("DRAFT");
      setNotes("");
    }
  }, [open, employees]);

  const valid = employeeId && start && end && end >= start;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    createTimesheet({ employeeId, periodStart: start, periodEnd: end, status, notes: notes || undefined });
    addToast("success", "Manual timesheet created");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Manual Timesheet"
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="create-ts-form" className="btn btn-primary" disabled={!valid}>Create</button>
        </>
      }
    >
      <form id="create-ts-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="form-label">Employee *</label>
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{`${emp.firstName} ${emp.lastName} — ${emp.employeeCode}`}</option>)}
          </Select>
        </div>
        <div>
          <label className="form-label">Period Start *</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Period End *</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
        </div>
        <div>
          <label className="form-label">Status</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as TimesheetStatus)}>
            {["DRAFT", "SUBMITTED"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <label className="form-label">Notes</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <p className="text-xs text-gray-500 sm:col-span-2">Manual timesheets are normally created by ADMIN/MANAGER overrides. Auto-compiled timesheets are generated from submitted daily logs.</p>
      </form>
    </Modal>
  );
}
