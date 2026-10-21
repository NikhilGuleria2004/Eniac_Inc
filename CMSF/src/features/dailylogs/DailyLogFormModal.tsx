import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import {
  getEmployees,
  getActiveAssignmentsByEmployee,
  getProjects,
  getDailyLogsByEmployee,
  createDailyLog,
  updateDailyLog,
} from "../../data/mock/repositories";
import { TASK_CATEGORIES } from "../../data/constants";
import type { DailyLog } from "../../types";

interface DailyLogFormModalProps {
  open: boolean;
  initialData?: DailyLog | null;
  onClose: () => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayOfWeekFor(dateStr: string): string {
  if (!dateStr) return "";
  return DAY_NAMES[new Date(`${dateStr}T00:00:00`).getDay()];
}

function isWeekendDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00`).getDay();
  return d === 0 || d === 6;
}

export function DailyLogFormModal({ open, initialData, onClose }: DailyLogFormModalProps) {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [employeeId, setEmployeeId] = useState(user?.employeeId ?? "");
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [taskCategory, setTaskCategory] = useState<DailyLog["taskCategory"]>("DEVELOPMENT");
  const [regularHours, setRegularHours] = useState(8);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [billingType, setBillingType] = useState<DailyLog["billingType"]>("BILLABLE");
  const [status, setStatus] = useState<DailyLog["status"]>("SUBMITTED");
  const [touched, setTouched] = useState(false);

  const isEmployeeRole = user?.role === "EMPLOYEE";
  const employees = getEmployees();
  const weekend = isWeekendDate(workDate);
  const total = Number(regularHours) + Number(overtimeHours);

  const projectOptions = useMemo(() => {
    if (!employeeId) return [];
    return getActiveAssignmentsByEmployee(employeeId)
      .map((a) => getProjects().find((p) => p.id === a.projectId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [employeeId]);

  const duplicate = useMemo(() => {
    if (!employeeId || !workDate || !projectId || initialData) return null;
    return getDailyLogsByEmployee(employeeId).find(
      (d) => d.workDate === workDate && d.projectId === projectId
    );
  }, [employeeId, workDate, projectId, initialData]);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (initialData) {
      setEmployeeId(initialData.employeeId);
      setWorkDate(initialData.workDate);
      setProjectId(initialData.projectId);
      setDescription(initialData.description);
      setTaskCategory(initialData.taskCategory);
      setRegularHours(initialData.regularHours);
      setOvertimeHours(initialData.overtimeHours);
      setBillingType(initialData.billingType);
      setStatus(initialData.status);
    } else {
      setEmployeeId(user?.employeeId ?? "");
      setWorkDate(new Date().toISOString().slice(0, 10));
      setProjectId("");
      setDescription("");
      setTaskCategory("DEVELOPMENT");
      setRegularHours(8);
      setOvertimeHours(0);
      setBillingType("BILLABLE");
      setStatus("SUBMITTED");
    }
  }, [open, initialData, user?.employeeId]);

  const errors = {
    projectId: projectId ? "" : "Project is required",
    description: description.trim().length >= 10 ? "" : "Description must be at least 10 characters",
    total: total > 24 ? "Total hours (regular + overtime) cannot exceed 24" : "",
    regular: regularHours < 0 ? "Regular hours must be 0 or greater" : "",
  };
  const isValid = !errors.projectId && !errors.description && !errors.total && !errors.regular && !!employeeId && !duplicate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;
    const payload = {
      employeeId,
      projectId,
      workDate,
      taskCategory,
      description: description.trim(),
      regularHours: Number(regularHours),
      overtimeHours: weekend ? Number(overtimeHours) : 0,
      billable: billingType === "BILLABLE",
      billingType,
      status,
      tags: [],
    };
    if (initialData) {
      updateDailyLog(initialData.id, payload);
      addToast("success", "Daily log updated");
    } else {
      createDailyLog(payload);
      addToast("success", "Hours logged");
    }
    onClose();
  };

  const showError = (msg: string) => (touched && msg ? <p className="text-xs text-danger mt-1">{msg}</p> : null);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Daily Log" : "Log Hours"}
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="daily-log-form" className="btn btn-primary" disabled={!isValid} title={isValid ? "" : "Resolve the highlighted errors to submit"}>
            {initialData ? "Save Changes" : "Submit Log"}
          </button>
        </>
      }
    >
      <form id="daily-log-form" onSubmit={handleSubmit} className="space-y-4">
        {touched && !isValid && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Please fix the highlighted fields before submitting.
          </div>
        )}
        {duplicate && (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            A log already exists for this employee on {workDate} for the selected project.{" "}
            <button type="button" className="underline" onClick={() => { setWorkDate(duplicate.workDate); onClose(); }}>
              Edit the existing entry
            </button>{" "}
            instead.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Employee *</label>
            <Select value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setProjectId(""); }} disabled={isEmployeeRole}>
              {isEmployeeRole
                ? <option value={user?.employeeId}>{`${user?.firstName ?? ""} ${user?.lastName ?? ""} (You)`.trim()}</option>
                : employees.map((emp) => <option key={emp.id} value={emp.id}>{`${emp.firstName} ${emp.lastName} — ${emp.employeeCode}`}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Work Date *</label>
            <Input
              type="date"
              value={workDate}
              onChange={(e) => {
                const v = e.target.value;
                setWorkDate(v);
                if (!isWeekendDate(v)) setOvertimeHours(0);
              }}
              required
            />
            {workDate && <p className="text-xs text-gray-500 mt-1">{dayOfWeekFor(workDate)}{weekend && " · overtime allowed"}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Project *</label>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
              <option value="">— Select assigned project —</option>
              {projectOptions.map((p) => <option key={p.id} value={p.id}>{`${p.name} (${p.projectCode})`}</option>)}
            </Select>
            {showError(errors.projectId)}
            {projectOptions.length === 0 && <p className="text-xs text-gray-500 mt-1">No active assignments for this employee.</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Work Description *</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the work performed..." />
            {showError(errors.description)}
          </div>
          <div>
            <label className="form-label">Task Category</label>
            <Select value={taskCategory} onChange={(e) => setTaskCategory(e.target.value as DailyLog["taskCategory"])}>
              {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Billing Type</label>
            <Select value={billingType} onChange={(e) => setBillingType(e.target.value as DailyLog["billingType"])}>
              <option value="BILLABLE">Billable</option>
              <option value="NON_BILLABLE">Non-billable</option>
            </Select>
          </div>
          <div className="flex flex-row items-start gap-2">
            <div className="flex-1">
              <label className="form-label whitespace-nowrap">Regular Hours (0.25 steps)</label>
              <Input
                className="w-full"
                type="number"
                min={0}
                max={24}
                step={0.25}
                value={regularHours}
                onChange={(e) => setRegularHours(Number(e.target.value))}
              />
              {showError(errors.regular)}
            </div>
            <div className="flex-1">
              <label className="form-label whitespace-nowrap">Overtime Hours {!weekend && "(weekend only)"}</label>
              <Input
                className="w-full"
                type="number"
                min={0}
                max={24}
                step={0.25}
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(Number(e.target.value))}
                disabled={!weekend}
              />
              {!weekend && <p className="text-xs text-gray-400 mt-1">Overtime is only allowed on Saturday and Sunday.</p>}
              {showError(errors.total)}
            </div>
          </div>
          <div>
            <label className="form-label">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as DailyLog["status"])}>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
            </Select>
          </div>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-600">Total: <span className="font-semibold text-gray-900">{total} h</span></p>
          </div>
        </div>
      </form>
    </Modal>
  );
}
