import { z } from "zod";
import { EMPLOYMENT_STATUSES, BILLING_STATUSES } from "../config/constants.js";
import { COUNTRIES, TECH_ROLES } from "../config/constants.js";

const employmentStatusEnum = z.enum(EMPLOYMENT_STATUSES);
const billingStatusEnum = z.enum(BILLING_STATUSES);
const employmentTypeEnum = z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]);
const countryEnum = z.enum(COUNTRIES);
const techRoleEnum = z.enum(TECH_ROLES);

export const employeeSearchQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  status: employmentStatusEnum.optional(),
  department: z.string().optional(),
  country: countryEnum.optional(),
  billingStatus: billingStatusEnum.optional(),
  managerId: z.string().optional(),
  designation: z.string().optional(),
  sortBy: z.enum(["employeeId", "firstName", "lastName", "department", "joiningDate", "createdAt"]).default("employeeId"),
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});

export type EmployeeSearchQuery = z.infer<typeof employeeSearchQuerySchema>;

export const createEmployeeSchema = z.object({
  employeeId: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
   workMail: z.string().email().optional(),
   phone: z.string().optional(),
  profilePhotoUrl: z.string().url().optional(),
  dateOfBirth: z.coerce.date().optional(),
   designation: z.string().min(1).max(100),
   techRole: techRoleEnum.optional(),
   department: z.string().min(1).max(100),
   managerId: z.string().optional(),
   country: countryEnum,
   employmentStatus: employmentStatusEnum.default("ONBOARDING"),
   billingStatus: billingStatusEnum.default("NON_BILLABLE"),
   joiningDate: z.coerce.date().optional(),
   employmentType: employmentTypeEnum.optional(),
   address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional()
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional()
    })
    .optional(),
  compensation: z
    .object({
      currency: z.string().optional(),
      salary: z.number().positive().optional(),
      payFrequency: z.enum(["MONTHLY", "YEARLY", "HOURLY"]).optional()
    })
    .optional(),
  billRate: z
    .object({
      currency: z.string().optional(),
      amount: z.number().positive().optional(),
      unit: z.enum(["HOURLY", "DAILY", "MONTHLY"]).optional()
    })
    .optional()
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const employeeSelfUpdateSchema = z.object({
  phone: z.string().optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional()
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional()
    })
    .optional(),
  profilePhotoUrl: z.string().url().optional()
});

export type EmployeeSelfUpdateInput = z.infer<typeof employeeSelfUpdateSchema>;

export const hrEmployeeUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    workMail: z.string().email().optional(),
    phone: z.string().optional(),
  profilePhotoUrl: z.string().url().optional(),
  dateOfBirth: z.coerce.date().optional(),
  designation: z.string().min(1).max(100).optional(),
  techRole: techRoleEnum.optional(),
  department: z.string().min(1).max(100).optional(),
  managerId: z.string().optional(),
  country: countryEnum.optional(),
  employmentStatus: employmentStatusEnum.optional(),
  billingStatus: billingStatusEnum.optional(),
  joiningDate: z.coerce.date().optional(),
  employmentType: employmentTypeEnum.optional(),
  address: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional()
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional()
    })
    .optional(),
  compensation: z
    .object({
      currency: z.string().optional(),
      salary: z.number().positive().optional(),
      payFrequency: z.enum(["MONTHLY", "YEARLY", "HOURLY"]).optional()
    })
    .optional(),
  billRate: z
    .object({
      currency: z.string().optional(),
      amount: z.number().positive().optional(),
      unit: z.enum(["HOURLY", "DAILY", "MONTHLY"]).optional()
    })
    .optional()
});

export type HrEmployeeUpdateInput = z.infer<typeof hrEmployeeUpdateSchema>;

export const managerEmployeeUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  designation: z.string().min(1).max(100).optional(),
  department: z.string().min(1).max(100).optional(),
  managerId: z.string().optional()
});

export type ManagerEmployeeUpdateInput = z.infer<typeof managerEmployeeUpdateSchema>;

export const updateBillingStatusSchema = z.object({
  billingStatus: billingStatusEnum
});

export type UpdateBillingStatusInput = z.infer<typeof updateBillingStatusSchema>;
