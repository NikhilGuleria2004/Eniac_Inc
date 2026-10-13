import { NavLink } from "react-router-dom";
import type { Employee } from "../../../types";
import { getAssignmentsByEmployee, getProjects, getClients } from "../../../data/mock/repositories";
import { ROUTES } from "../../../data/constants";
import { StatusBadge } from "../../../components/data/StatusBadge";

export function ProjectsTab({ employee }: { employee: Employee }) {
  const assignments = getAssignmentsByEmployee(employee.id);
  const projects = getProjects();
  const clients = getClients();
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Project Assignments ({assignments.length})
      </h3>
      {assignments.length === 0 ? (
        <p className="text-sm text-gray-500">No project assignments.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">Project</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Client</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Role</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Allocation</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Billable</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const proj = projects.find((p) => p.id === a.projectId);
                const client = proj ? clients.find((c) => c.id === proj.clientId) : undefined;
                return (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-2 px-3">
                      {proj ? (
                        <NavLink
                          to={ROUTES.PROJECT_DETAIL(proj.id)}
                          className="text-accent hover:underline"
                        >
                          {proj.name}
                        </NavLink>
                      ) : (
                        a.projectId
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-600">{client?.name ?? "—"}</td>
                    <td className="py-2 px-3 text-gray-600">{a.role}</td>
                    <td className="py-2 px-3 text-gray-600">{a.allocation}%</td>
                    <td className="py-2 px-3">
                      <StatusBadge status={a.billable ? "BILLABLE" : "NON_BILLABLE"} />
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
