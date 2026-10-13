import { NavLink, useParams, Navigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { hasPermission } from "../../lib/permissions";
import { getEmployeeById } from "../../data/mock/repositories";
import { ROUTES } from "../../data/constants";
import { PageHeader } from "../../components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { StatusBadge } from "../../components/data/StatusBadge";
import { EmployeeAvatar } from "../../components/data/EmployeeAvatar";
import { OverviewTab } from "./tabs/OverviewTab";
import { EmploymentTab } from "./tabs/EmploymentTab";
import { GeographyTab } from "./tabs/GeographyTab";
import { CompensationTab } from "./tabs/CompensationTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { AttendanceTab } from "./tabs/AttendanceTab";
import { LeaveTab } from "./tabs/LeaveTab";
import { ReviewsTab } from "./tabs/ReviewsTab";
import { ProjectsTab } from "./tabs/ProjectsTab";
import { TimesheetTab } from "./tabs/TimesheetTab";
export function EmployeeProfilePage() {
  const { employeeId } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "EMPLOYEE";
  const employee = employeeId ? getEmployeeById(employeeId) : undefined;
  if (!hasPermission(role, "employee.view")) return <Navigate to="/403" replace />;
  if (!employee) return (<div className="page-container"><div className="card"><h1 className="text-lg font-semibold text-gray-900">Employee not found</h1><p className="text-sm text-gray-500 mt-1">The requested employee record does not exist.</p><NavLink to={ROUTES.EMPLOYEES} className="btn btn-secondary text-sm mt-4">Back to Directory</NavLink></div></div>);
  const canEdit = hasPermission(role, "employee.edit");
  const name = employee.firstName + " " + employee.lastName;
  return (
    <div className="page-container space-y-6">
      <PageHeader title={name} description={employee.employeeCode + " | " + employee.designation + " | " + employee.department}
        breadcrumbs={[{ label: "Employees", href: ROUTES.EMPLOYEES }, { label: name }]}
        actions={canEdit ? (<NavLink to={ROUTES.EMPLOYEE_EDIT(employee.id)} className="btn btn-primary text-sm"><Pencil size={16} /> Edit Employee</NavLink>) : undefined} />
      <div className="card min-w-0"><div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <EmployeeAvatar firstName={employee.firstName} lastName={employee.lastName} avatar={employee.avatar} size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 break-words">{name}</h2>
          <p className="text-sm text-gray-500 break-words">{employee.email} | {employee.phone}</p>
          <div className="flex flex-wrap gap-2 mt-2"><StatusBadge status={employee.employmentStatus} /><StatusBadge status={employee.billingStatus} /><StatusBadge status={employee.timesheetEligibility} /></div>
        </div>
      </div></div>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="timesheet">Timesheet</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="overview"><OverviewTab employee={employee} /></TabsContent>
          <TabsContent value="employment"><EmploymentTab employee={employee} /></TabsContent>
          <TabsContent value="geography"><GeographyTab employee={employee} /></TabsContent>
          <TabsContent value="compensation"><CompensationTab employee={employee} /></TabsContent>
          <TabsContent value="documents"><DocumentsTab employee={employee} /></TabsContent>
          <TabsContent value="attendance"><AttendanceTab employee={employee} /></TabsContent>
          <TabsContent value="leave"><LeaveTab employee={employee} /></TabsContent>
          <TabsContent value="reviews"><ReviewsTab employee={employee} /></TabsContent>
          <TabsContent value="projects"><ProjectsTab employee={employee} /></TabsContent>
          <TabsContent value="timesheet"><TimesheetTab employee={employee} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
