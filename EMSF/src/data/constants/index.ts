import type { Permission, Role } from "../../types";

export const ROLES: Role[] = ["ADMIN", "HR", "MANAGER", "SUPERVISOR", "EMPLOYEE"] as const;

export const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Human Resources",
  "Finance",
  "Sales",
  "Marketing",
  "Operations",
  "Quality Assurance",
  "Customer Success",
  "Administration",
] as const;

export const DESIGNATIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "Engineering Manager",
  "Product Manager",
  "Project Manager",
  "UI/UX Designer",
  "HR Executive",
  "HR Manager",
  "Finance Analyst",
  "Business Analyst",
  "QA Engineer",
  "Technical Lead",
  "DevOps Engineer",
  "Sales Manager",
  "Operations Manager",
  "Customer Success Manager",
] as const;

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT"] as const;

export const LEAVE_TYPES = ["PAID", "SICK", "CASUAL", "UNPAID"] as const;

export const COUNTRIES = ["India", "United States"] as const;

export const CITIES: Record<string, string[]> = {
  India: ["Bangalore", "Hyderabad", "Mumbai", "Pune", "Chennai", "Delhi", "Kolkata", "Ahmedabad"],
  "United States": ["New York", "San Francisco", "Chicago", "Austin", "Seattle", "Boston", "Denver", "Miami"],
};

export const INDIAN_STATES = [
  "Karnataka", "Telangana", "Maharashtra", "West Bengal", "Tamil Nadu",
  "Delhi", "Gujarat", "Odisha", "Rajasthan", "Uttar Pradesh",
];

export const US_STATES = [
  "California", "Texas", "Illinois", "New York", "Florida",
  "Washington", "Massachusetts", "Colorado", "Arizona", "Georgia",
];

export const INDUSTRIES = [
  "Technology",
  "Manufacturing",
  "Consulting",
  "Healthcare",
  "Financial Services",
  "E-commerce",
  "Media & Entertainment",
  "Education",
  "Telecommunications",
  "Energy",
];

export const CLIENT_NAMES = [
  "ACME Corporation", "Globex Industries", "Initech Solutions", "Hooli Tech",
  "Soylent Corp", "Umbrella Group", "Wayne Enterprises", "Stark Industries",
  "Cyberdyne Systems", "Weyland-Yutani", "Massive Dynamic", "Nakatomi Trading",
  "Wonka Industries", "Gringotts Bank", "Soylent Foods", "Virtucon",
  "Tyrell Corporation", "Cyberdyne Robotics", "Kroger Industries", "Vandelay",
];

export const PROJECT_NAMES = [
  "Project Alpha", "Project Beta", "Project Gamma", "Project Delta",
  "Project Epsilon", "Project Zeta", "Project Eta", "Project Theta",
  "Project Iota", "Project Kappa", "Project Lambda", "Project Mu",
  "Project Nu", "Project Xi", "Project Omicron", "Project Pi",
  "Project Rho", "Project Sigma", "Project Tau", "Project Upsilon",
];

export const INDIAN_FIRST_NAMES = [
  "Aarav", "Aryan", "Vihaan", "Kabir", "Rohan", "Arjun", "Raj", "Karan",
  "Priya", "Ananya", "Sara", "Riya", "Neha", "Pooja", "Shreya", "Aditi",
  "Vivaan", "Siddharth", "Amit", "Sanjay", "Rahul", "Ravi", "Vijay", "Manoj",
  "Anjali", "Divya", "Swati", "Kavita", "Meera", "Geeta",
];

export const INDIAN_LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Kumar", "Patel", "Singh", "Rao", "Reddy",
  "Das", "Nair", "Menon", "Iyer", "Joshi", "Malhotra", "Kapoor", "Chopra",
  "Mehta", "Shah", "Bose", "Dutta", "Mukherjee", "Chatterjee", "Ghosh", "Dasgupta",
];

export const US_FIRST_NAMES = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
];

export const US_LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
];

export const DEMO_USERS: { email: string; password: string; role: Role; name: string }[] = [
  { email: "superadmin@eniacinc.com", password: "Eniacinc1", role: "ADMIN", name: "Superadmin User" },
  { email: "hreniac@eniacinc.com", password: "Eniacinc2", role: "HR", name: "HR User" },
  { email: "manager@eniacinc.com", password: "Eniacinc3", role: "MANAGER", name: "Manager User" },
  { email: "supervisor@eniacinc.com", password: "Eniacinc4", role: "SUPERVISOR", name: "Supervisor User" },
  { email: "employee@eniacinc.com", password: "Eniacinc5", role: "EMPLOYEE", name: "Employee User" },
];

export const ENV_LABEL = "DEMO";

export const ROUTES = {
  DASHBOARD: "/dashboard",
  EMPLOYEES: "/employees",
  EMPLOYEE_DETAIL: (id: string) => `/employees/${id}`,
  EMPLOYEE_EDIT: (id: string) => `/employees/${id}/edit`,
  ONBOARDING: "/onboarding",
  ONBOARDING_DETAIL: (id: string) => `/onboarding/${id}`,
  DOCUMENTS: "/documents",
  DOCUMENT_DETAIL: (id: string) => `/documents/${id}`,
  ATTENDANCE: "/attendance",
  ATTENDANCE_DETAIL: (id: string) => `/attendance/${id}`,
  LEAVE: "/leave",
  LEAVE_REQUEST: "/leave/request",
  LEAVE_DETAIL: (id: string) => `/leave/${id}`,
  REVIEWS: "/reviews",
  REVIEW_DETAIL: (id: string) => `/reviews/${id}`,
  CLIENTS: "/clients",
  CLIENT_DETAIL: (id: string) => `/clients/${id}`,
  PROJECTS: "/projects",
  PROJECT_DETAIL: (id: string) => `/projects/${id}`,
  PROJECT_EDIT: (id: string) => `/projects/${id}/edit`,
  ASSIGNMENTS: "/assignments",
  REPORTS: "/reports",
  NOTIFICATIONS: "/notifications",
  AUDIT_LOG: "/audit-log",
  SETTINGS: "/settings",
  PROFILE: "/profile",
  ANALYTICS: "/analytics",
} as const;

export const ALL_PERMISSIONS: Permission[] = [
  "employee.view",
  "employee.create",
  "employee.edit",
  "employee.delete",
  "employee.deactivate",
  "onboarding.manage",
  "document.manage",
  "document.view",
  "document.review",
  "attendance.manage",
  "attendance.view",
  "attendance.mark",
  "leave.manage",
  "leave.approve",
  "leave.view",
  "review.manage",
  "review.view",
  "compensation.view",
  "compensation.manage",
  "client.manage",
  "client.view",
  "project.manage",
  "project.view",
  "assignment.manage",
  "assignment.view",
  "report.view",
  "audit.view",
  "settings.manage",
  "notification.view",
  "profile.edit",
  "salary.view",
  "billRate.view",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ALL_PERMISSIONS,
  HR: [
    "employee.view",
    "employee.create",
    "employee.edit",
    "employee.delete",
    "employee.deactivate",
    "onboarding.manage",
    "document.manage",
    "document.view",
    "document.review",
    "attendance.manage",
    "attendance.view",
    "attendance.mark",
    "leave.manage",
    "leave.approve",
    "leave.view",
    "review.manage",
    "review.view",
    "compensation.view",
    "compensation.manage",
    "salary.view",
    "billRate.view",
    "client.view",
    "project.view",
    "assignment.view",
    "report.view",
    "notification.view",
    "profile.edit",
  ],
  MANAGER: [
    "employee.view",
    "document.view",
    "attendance.view",
    "attendance.mark",
    "leave.view",
    "review.view",
    "client.manage",
    "client.view",
    "project.manage",
    "project.view",
    "assignment.manage",
    "assignment.view",
    "billRate.view",
    "report.view",
    "notification.view",
    "profile.edit",
  ],
  SUPERVISOR: [
    "employee.view",
    "document.view",
    "attendance.view",
    "attendance.mark",
    "leave.view",
    "review.view",
    "project.view",
    "assignment.manage",
    "assignment.view",
    "notification.view",
    "profile.edit",
  ],
  EMPLOYEE: [
    "attendance.mark",
    "attendance.view",
    "leave.view",
    "document.view",
    "review.view",
    "project.view",
    "assignment.view",
    "notification.view",
    "profile.edit",
  ],
};

export interface SidebarItem {
  label: string;
  route: string;
}

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export const SIDEBAR_SECTIONS: Record<Role, SidebarSection[]> = {
  ADMIN: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", route: "/dashboard" },
      ],
    },
    {
      label: "Workforce",
      items: [
        { label: "Employees", route: "/employees" },
        { label: "Onboarding", route: "/onboarding" },
        { label: "Documents", route: "/documents" },
        { label: "Reviews", route: "/reviews" },
      ],
    },
    {
      label: "Time & Leave",
      items: [
        { label: "Attendance", route: "/attendance" },
        { label: "Leave", route: "/leave" },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Clients", route: "/clients" },
        { label: "Projects", route: "/projects" },
        { label: "Assignments", route: "/assignments" },
      ],
    },
    {
      label: "Reporting",
      items: [
        { label: "Reports", route: "/reports" },
        { label: "Analytics", route: "/analytics" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Notifications", route: "/notifications" },
        { label: "Audit Log", route: "/audit-log" },
        { label: "Settings", route: "/settings" },
        { label: "Profile", route: "/profile" },
      ],
    },
  ],
  HR: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", route: "/dashboard" },
      ],
    },
    {
      label: "Workforce",
      items: [
        { label: "Employees", route: "/employees" },
        { label: "Onboarding", route: "/onboarding" },
        { label: "Documents", route: "/documents" },
        { label: "Reviews", route: "/reviews" },
      ],
    },
    {
      label: "Time & Leave",
      items: [
        { label: "Attendance", route: "/attendance" },
        { label: "Leave", route: "/leave" },
      ],
    },
    {
      label: "Reporting",
      items: [
        { label: "Reports", route: "/reports" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Notifications", route: "/notifications" },
        { label: "Settings", route: "/settings" },
        { label: "Profile", route: "/profile" },
      ],
    },
  ],
  MANAGER: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", route: "/dashboard" },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Clients", route: "/clients" },
        { label: "Projects", route: "/projects" },
        { label: "Assignments", route: "/assignments" },
      ],
    },
    {
      label: "Reporting",
      items: [
        { label: "Reports", route: "/reports" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Notifications", route: "/notifications" },
        { label: "Settings", route: "/settings" },
      ],
    },
  ],
  SUPERVISOR: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", route: "/dashboard" },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Projects", route: "/projects" },
        { label: "Assignments", route: "/assignments" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Notifications", route: "/notifications" },
        { label: "Settings", route: "/settings" },
        { label: "Profile", route: "/profile" },
      ],
    },
  ],
  EMPLOYEE: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", route: "/dashboard" },
      ],
    },
    {
      label: "My Work",
      items: [
        { label: "Attendance", route: "/attendance" },
        { label: "Leave", route: "/leave" },
        { label: "Documents", route: "/documents" },
        { label: "Projects", route: "/projects" },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Notifications", route: "/notifications" },
        { label: "Profile", route: "/profile" },
      ],
    },
  ],
};