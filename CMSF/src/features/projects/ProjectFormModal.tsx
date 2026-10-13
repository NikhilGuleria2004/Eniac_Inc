import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { getClients, getEmployees, createProject, updateProject } from "../../data/mock/repositories";
import { PROJECT_STATUSES, PROJECT_HEALTH, PROJECT_TIERS } from "../../data/constants";
import type { Project } from "../../types";

interface ProjectFormModalProps {
  open: boolean;
  initialData?: Project | null;
  onClose: () => void;
}

type ProjectPayload = Omit<Project, "id" | "projectCode" | "teamSize" | "createdAt" | "updatedAt">;

export function ProjectFormModal({ open, initialData, onClose }: ProjectFormModalProps) {
  const { addToast } = useToast();
  const clients = useMemo(() => getClients(), [open]);
  const managers = useMemo(() => getEmployees().filter((e) => e.role === "MANAGER"), [open]);
  const supervisors = useMemo(() => getEmployees().filter((e) => e.role === "SUPERVISOR"), [open]);

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "");
  const [supervisorId, setSupervisorId] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<Project["status"]>("PLANNING");
  const [health, setHealth] = useState<Project["health"]>("ON_TRACK");
  const [budget, setBudget] = useState("");
  const [tier, setTier] = useState<Project["tier"]>("MEDIUM");
  const [visibility, setVisibility] = useState<Project["visibility"]>("CLIENT_VISIBLE");

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setClientId(initialData.clientId);
      setManagerId(initialData.managerId);
      setSupervisorId(initialData.supervisorId ?? "");
      setDescription(initialData.description);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
      setStatus(initialData.status);
      setHealth(initialData.health);
      setBudget(initialData.budget ? String(initialData.budget) : "");
      setTier(initialData.tier ?? "MEDIUM");
      setVisibility(initialData.visibility);
    } else if (open && !initialData) {
      setName(""); setClientId(clients[0]?.id ?? ""); setManagerId(managers[0]?.id ?? "");
      setSupervisorId(""); setDescription(""); setStartDate(""); setEndDate("");
      setStatus("PLANNING"); setHealth("ON_TRACK"); setBudget(""); setTier("MEDIUM"); setVisibility("CLIENT_VISIBLE");
    }
  }, [open, initialData, clients, managers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find((c) => c.id === clientId);
    const payload: ProjectPayload = {
      name,
      clientId,
      clientName: client?.name ?? "",
      managerId,
      supervisorId: supervisorId || undefined,
      description,
      startDate,
      endDate,
      progress: initialData?.progress ?? 0,
      status,
      health,
      budget: budget ? Number(budget) : undefined,
      budgetCurrency: budget ? "USD" : undefined,
      tier,
      billable: initialData?.billable ?? true,
      tags: initialData?.tags ?? [],
      visibility,
    };
    if (initialData) {
      updateProject(initialData.id, payload);
      addToast("success", "Project updated");
    } else {
      createProject(payload);
      addToast("success", "Project created");
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Project" : "New Project"}
      size="xl"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" form="project-form" className="btn btn-primary">{initialData ? "Save Changes" : "Create Project"}</button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">Project Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">Project Code</label>
            <Input value={initialData?.projectCode ?? "Auto-generated"} disabled />
          </div>
          <div>
            <label className="form-label">Client *</label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Manager</label>
            <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              {managers.map((m) => <option key={m.id} value={m.id}>{`${m.firstName} ${m.lastName}`}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Supervisor (optional)</label>
            <Select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
              <option value="">None</option>
              {supervisors.map((s) => <option key={s.id} value={s.id}>{`${s.firstName} ${s.lastName}`}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Budget</label>
            <Input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="USD" />
          </div>
          <div>
            <label className="form-label">Start Date *</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">End Date *</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
          <div>
            <label className="form-label">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as Project["status"])}>
              {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Health</label>
            <Select value={health} onChange={(e) => setHealth(e.target.value as Project["health"])}>
              {PROJECT_HEALTH.map((h) => <option key={h} value={h}>{h.replace("_", " ")}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Project Tier</label>
            <Select value={tier} onChange={(e) => setTier(e.target.value as Project["tier"])}>
              {PROJECT_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <label className="form-label">Visibility</label>
            <Select value={visibility} onChange={(e) => setVisibility(e.target.value as Project["visibility"])}>
              <option value="CLIENT_VISIBLE">Client Visible</option>
              <option value="INTERNAL">Internal</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="form-label">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
      </form>
    </Modal>
  );
}
