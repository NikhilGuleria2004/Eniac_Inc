import { useMemo, useState } from "react";
import { Calendar, Clock, Save } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../features/auth/AuthContext";
import { getActiveAssignmentsByEmployee, getProjects, getDailyLogsByEmployee, createDailyLog } from "../../data/mock/repositories";
import { TASK_CATEGORIES } from "../../data/constants";
import type { DailyLog } from "../../types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayOfWeekFor(dateStr: string): string {
  if (!dateStr) return "";
  return DAY_NAMES[new Date(`${dateStr}T00:00:00`).getDay()];
}

function isWeekend(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00`).getDay();
  return d === 0 || d === 6;
}

export function DailyLogQuickForm() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [taskCategory, setTaskCategory] = useState<DailyLog["taskCategory"]>("DEVELOPMENT");
  const [regularHours, setRegularHours] = useState(8);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [billingType, setBillingType] = useState<DailyLog["billingType"]>("BILLABLE");
  const [touched, setTouched] = useState(false);

  const employeeId = user?.employeeId ?? "";
  const weekend = isWeekend(workDate);
  const total = Number(regularHours) + Number(overtimeHours);

  const projectOptions = useMemo(() => {
    if (!employeeId) return [];
    return getActiveAssignmentsByEmployee(employeeId)
      .map((a) => getProjects().find((p) => p.id === a.projectId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [employeeId]);

  const duplicate = useMemo(() => {
    if (!employeeId || !workDate || !projectId) return null;
    return getDailyLogsByEmployee(employeeId).find(
      (d) => d.workDate === workDate && d.projectId === projectId,
    );
  }, [employeeId, workDate, projectId]);

  const errors = {
    projectId: projectId ? "" : "Project is required",
    description: description.trim().length >= 10 ? "" : "Description must be at least 10 characters",
    total: total > 24 ? "Total hours cannot exceed 24" : "",
    regular: regularHours < 0 ? "Regular hours must be 0 or greater" : "",
  };
  const isValid = !errors.projectId && !errors.description && !errors.total && !errors.regular && !!employeeId && !duplicate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    createDailyLog({
      employeeId,
      projectId,
      workDate,
      taskCategory,
      description: description.trim(),
      regularHours: Number(regularHours),
      overtimeHours: weekend ? Number(overtimeHours) : 0,
      billable: billingType === "BILLABLE",
      billingType,
      status: "SUBMITTED",
      tags: [],
    });

    addToast("success", "Hours logged");
    setTouched(false);
    setProjectId("");
    setDescription("");
    setTaskCategory("DEVELOPMENT");
    setRegularHours(8);
    setOvertimeHours(0);
    setBillingType("BILLABLE");
  };

  const showError = (msg: string) =>
    touched && msg ? <p className="text-xs text-danger mt-1">{msg}</p> : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {touched && !isValid && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Please fix the highlighted fields before submitting.
        </div>
      )}
      {duplicate && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
          A log already exists for {workDate} on {duplicate.projectName}. Edit it from Daily Logs instead.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">Work Date *</label>
          <Input
            type="date"
            value={workDate}
            onChange={(e) => {
              const v = e.target.value;
              setWorkDate(v);
              if (!isWeekend(v)) setOvertimeHours(0);
            }}
            required
          />
          {workDate && (
            <p className="text-xs text-gray-500 mt-1">
              {dayOfWeekFor(workDate)}
              {weekend && " · overtime allowed"}
            </p>
          )}
        </div>
        <div>
          <label className="form-label">Hours</label>
          <div className="flex items-end gap-2">
            <div className="flex flex-row items-start gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 whitespace-nowrap">Regular</label>
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
                <label className="text-xs text-gray-500 whitespace-nowrap">
                  Overtime {!weekend && "(weekend)"}
                </label>
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
                {!weekend && <p className="text-xs text-gray-400">Sat/Sun only</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
              <Clock size={16} />
              {total} h
            </div>
          </div>
          {showError(errors.total)}
        </div>
      </div>

      <div>
        <label className="form-label">Project *</label>
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
          <option value="">— Select assigned project —</option>
          {projectOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.projectCode})
            </option>
          ))}
        </Select>
        {showError(errors.projectId)}
        {projectOptions.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">No active assignments found.</p>
        )}
      </div>

      <div>
        <label className="form-label">Work Description *</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What did you work on today?"
        />
        {showError(errors.description)}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label">Task Category</label>
          <Select value={taskCategory} onChange={(e) => setTaskCategory(e.target.value as DailyLog["taskCategory"])}>
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="form-label">Billing Type</label>
          <Select value={billingType} onChange={(e) => setBillingType(e.target.value as DailyLog["billingType"])}>
            <option value="BILLABLE">Billable</option>
            <option value="NON_BILLABLE">Non-billable</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-gray-500">
            <Calendar size={14} />
            {workDate}
          </span>
          {billingType === "BILLABLE" && (
            <span className="text-green-600 font-medium">✓ Billable</span>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={!isValid}>
          <Save size={16} className="mr-2" />
          {duplicate ? "Resolve duplicate" : "Log Hours"}
        </button>
      </div>
    </form>
  );
}
