export const STANDARD_RESOURCE_RATES: Record<string, number> = {
  "US Based AEM Developer": 23400,
  "US Based Developer": 23400,
  "US Based Senior Developer": 27000,
  "US Based Lead": 32000,
  "US Based DevOps Engineer": 25000,
  "US Based QA Engineer": 19000,
  "US Based Designer": 18000,
  "US Based Analyst": 17000,
  "EU Based Web Developer": 20584,
  "EU Based Developer": 20584,
  "EU Based Senior Developer": 23000,
  "EU Based Lead": 28000,
  "EU Based DevOps Engineer": 19500,
  "EU Based QA Engineer": 16500,
  "EU Based Designer": 15000,
  "EU Based Analyst": 14500,
  "India-Based AEM Developer": 6240,
  "India-Based Developer": 6240,
  "India-Based Senior Developer": 8000,
  "India-Based Lead": 10000,
  "India-Based 24/7 Offshore Dev-ops personnel": 13996,
  "India-Based DevOps Engineer": 11000,
  "India-Based QA Engineer": 4800,
  "India-Based Designer": 4200,
  "India-Based Analyst": 5400,
};

export function techRoleToTier(role: string): string {
  const map: Record<string, string> = {
    "Java Developer": "Developer",
    "Frontend Developer": "Developer",
    "Backend Developer": "Developer",
    "Full Stack Developer": "Developer",
    "AEM Developer": "Developer",
    "Web Developer": "Developer",
    "Senior Developer": "Senior Developer",
    "Technical Lead": "Lead",
    "Solution Architect": "Lead",
    "Project Manager": "Lead",
    "DevOps Engineer": "DevOps Engineer",
    "QA Engineer": "QA Engineer",
    "UI/UX Designer": "Designer",
    "Business Analyst": "Analyst",
    "Scrum Master": "Analyst",
    "Data Engineer": "Analyst",
  };
  return map[role] ?? "Developer";
}

export function geographyOf(country: string): string {
  if (country === "India") return "India-Based";
  if (country === "United States") return "US Based";
  return "EU Based";
}

export function resolveResourceRate(employee: { country: string; techRole?: string; designation: string }): number | undefined {
  const geography = geographyOf(employee.country);
  const role = employee.techRole ?? employee.designation;
  const exactKey = `${geography} ${role}`;
  if (STANDARD_RESOURCE_RATES[exactKey] !== undefined) return STANDARD_RESOURCE_RATES[exactKey];
  return STANDARD_RESOURCE_RATES[`${geography} ${techRoleToTier(role)}`];
}
