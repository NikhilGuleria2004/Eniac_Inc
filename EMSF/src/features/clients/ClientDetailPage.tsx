import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Building2, Mail, Phone, MapPin, Users, Briefcase, Clock, ArrowLeft, Plus, TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { StatusBadge } from "../../components/data/StatusBadge";
import { Progress } from "../../components/ui/Progress";
import { DataTable } from "../../components/tables/DataTable";
import { getClientById } from "../../data/mock/repositories";
import { getAuditLogs } from "../../data/mock/repositories";
import { getClientProjects, getActiveProjectCount, computeClientProgress } from "./clients";
import { ROUTES } from "../../data/constants";
import type { Project } from "../../types";

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const client = useMemo(() => getClientById(clientId!), [clientId]);
  const projects = useMemo(() => getClientProjects(clientId!), [clientId]);
  const auditLogs = useMemo(() => getAuditLogs().filter((log) => log.entity === "CLIENT" && log.entityId === clientId).slice(0, 10), [clientId]);

  if (!client) return <div className="page-container"><h1 className="text-xl font-semibold text-gray-900">Client not found</h1></div>;

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const progress = computeClientProgress(projects);

  const handleBack = () => navigate(-1);

  const overviewColumns = [
    { key: "name", header: "Project", cell: (row: Project) => <Link to={ROUTES.PROJECT_DETAIL(row.id)} className="font-medium text-gray-900 hover:text-accent">{row.name}</Link> },
    { key: "projectCode", header: "Code", cell: (row: Project) => row.projectCode },
    { key: "status", header: "Status", cell: (row: Project) => <StatusBadge status={row.status} /> },
    { key: "health", header: "Health", cell: (row: Project) => <StatusBadge status={row.health} /> },
    { key: "progress", header: "Progress", cell: (row: Project) => <Progress value={row.progress} showLabel max={100} className="w-32" /> },
    { key: "teamSize", header: "Team", cell: (row: Project) => row.teamSize },
    { key: "startDate", header: "Start", cell: (row: Project) => new Date(row.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
    { key: "endDate", header: "End", cell: (row: Project) => new Date(row.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
  ];

  const activityColumns = [
    { key: "timestamp", header: "Time", cell: (row: any) => new Date(row.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) },
    { key: "userName", header: "User", cell: (row: any) => row.userName },
    { key: "action", header: "Action", cell: (row: any) => <StatusBadge status={row.action} /> },
    { key: "description", header: "Description", cell: (row: any) => row.description },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-md text-gray-500"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{client.name}</h1>
          <p className="text-sm text-gray-500">{client.clientCode} • {client.country} • {client.industry}</p>
        </div>
        <div className="flex-1" />
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
          <Building2 size={14} className="text-gray-500" />
          <span className="text-sm text-gray-600">{client.country}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
          <TrendingUp size={14} className="text-gray-500" />
          <span className="text-sm text-gray-600">{client.industry}</span>
        </div>
        <StatusBadge status={client.status} />
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
          <Users size={14} className="text-gray-500" />
          <span className="text-sm text-gray-600">{activeProjects.length} active projects</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
          <Clock size={14} className="text-gray-500" />
          <span className="text-sm text-gray-600">Avg progress: {progress.progress}%</span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Project Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Overall Progress</span>
                  <span className="font-medium text-gray-900">{progress.progress}%</span>
                </div>
                <Progress value={progress.progress} showLabel max={100} />
                <p className="text-xs text-gray-500">{progress.completed} of {progress.total} active projects completed</p>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Projects</h3>
                {projects.length > 0 ? (
                  <DataTable data={projects} columns={overviewColumns} keyExtractor={(r) => r.id} emptyState={{ title: "No projects" }} />
                ) : (
                  <div className="text-center py-8 text-gray-500">No projects for this client</div>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Client Info</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Client Code</dt><dd className="font-medium text-gray-900">{client.clientCode}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Country</dt><dd className="font-medium text-gray-900">{client.country}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Industry</dt><dd className="font-medium text-gray-900">{client.industry}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><StatusBadge status={client.status} /></dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd className="font-medium text-gray-900">{new Date(client.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Active Projects</dt><dd className="font-medium text-gray-900">{getActiveProjectCount(client.id)}</dd></div>
                </dl>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Primary Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-md">
                <Mail size={20} className="text-gray-400" />
                <div><p className="text-xs text-gray-500">Email</p><p className="font-medium text-gray-900">{client.primaryContact.email}</p></div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-md">
                <Phone size={20} className="text-gray-400" />
                <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium text-gray-900">{client.primaryContact.phone}</p></div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-md">
                <MapPin size={20} className="text-gray-400" />
                <div><p className="text-xs text-gray-500">Country</p><p className="font-medium text-gray-900">{client.country}</p></div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-md">
                <Building2 size={20} className="text-gray-400" />
                <div><p className="text-xs text-gray-500">Contact Name</p><p className="font-medium text-gray-900">{client.primaryContact.name}</p></div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {projects.length > 0 ? (
            <DataTable
              data={projects}
              columns={overviewColumns}
              keyExtractor={(r) => r.id}
              emptyState={{ title: "No projects" }}
            />
          ) : (
            <div className="card text-center py-12">
              <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-4">This client doesn't have any projects assigned.</p>
              <Link to={ROUTES.PROJECT_DETAIL("new")} className="btn btn-primary inline-flex">
                <Plus size={16} className="mr-2" />
                Create Project
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {auditLogs.length > 0 ? (
            <DataTable data={auditLogs} columns={activityColumns} keyExtractor={(r) => r.id} emptyState={{ title: "No activity" }} />
          ) : (
            <div className="card text-center py-12">
              <Clock size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
              <p className="text-gray-500">No audit log entries for this client.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}