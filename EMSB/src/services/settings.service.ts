import { SettingsRepository } from "../repositories/settings.repository.js";
import type { Setting } from "../models/settings.js";
import type { SettingCategory } from "../config/constants.js";
import { NotFoundError } from "../utils/errors.js";
import { toISO } from "../utils/dates.js";
import { writeAuditLog } from "../utils/audit.js";
import type { Role } from "../config/constants.js";
import type { SettingsListQuery, SettingsUpdateInput, SettingDTO } from "../schemas/settings.schemas.js";

const DEFAULT_SETTINGS: Record<string, { category: SettingCategory; value: unknown; description?: string }> = {
  leave_types: {
    category: "leave_types",
    value: ["PAID", "SICK", "CASUAL", "UNPAID"],
    description: "Available leave types"
  },
  attendance_work_hours: {
    category: "attendance",
    value: { start: "09:00", end: "18:00", lunchDuration: 60 },
    description: "Default work hours"
  },
  attendance_late_threshold: {
    category: "attendance",
    value: 10,
    description: "Minutes before marked as late"
  },
  document_expiry_warning_days: {
    category: "documents",
    value: 30,
    description: "Days before expiry to show warning"
  },
  document_expired_threshold_days: {
    category: "documents",
    value: 0,
    description: "Days after expiry to mark as expired"
  },
  organization_name: {
    category: "organization",
    value: "Eniac Inc.",
    description: "Organization name"
  },
  organization_timezone: {
    category: "organization",
    value: "UTC",
    description: "Organization timezone"
  },
  notification_email_enabled: {
    category: "notifications",
    value: true,
    description: "Send email notifications"
  },
  notification_in_app_enabled: {
    category: "notifications",
    value: true,
    description: "Show in-app notifications"
  },
  notification_leave_approval: {
    category: "notifications",
    value: true,
    description: "Email approvers on new leave requests"
  },
  departments: {
    category: "departments",
    value: ["Engineering", "Product", "Design", "Operations", "HR", "Sales", "Marketing"],
    description: "Organization departments"
  },
  designations: {
    category: "designations",
    value: ["Software Engineer", "Senior Software Engineer", "Tech Lead", "Architect", "Product Manager", "Manager"],
    description: "Job designations"
  },
  employment_types: {
    category: "employment_types",
    value: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"],
    description: "Employment type options"
  },
  countries: {
    category: "countries",
    value: ["INDIA", "USA"],
    description: "Supported countries"
  },
  document_types: {
    category: "document_types",
    value: ["RESUME", "OFFER_LETTER", "EMPLOYMENT_AGREEMENT", "ID_PROOF", "ADDRESS_PROOF", "TAX_DOCUMENT", "BANK_DOCUMENT", "CERTIFICATE", "NDA", "OTHER"],
    description: "Document type classifications"
  }
};

export class SettingsService {
  constructor(
    private settingsRepository: SettingsRepository
  ) {}

  private async initDefaults(): Promise<void> {
    const existing = await this.settingsRepository.findAll();
    const existingKeys = new Set(existing.map((s) => s.key));

    const toCreate: Omit<Setting, "_id">[] = [];
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      if (!existingKeys.has(key)) {
        toCreate.push({
          key,
          category: def.category,
          value: def.value,
          description: def.description,
          updatedAt: new Date(),
          createdAt: new Date()
        });
      }
    }

    if (toCreate.length > 0) {
      await this.settingsRepository.upsertMany(toCreate);
    }
  }

  private toDTO(setting: Setting): SettingDTO {
    return {
      key: setting.key,
      category: setting.category as SettingCategory,
      value: setting.value,
      description: setting.description,
      updatedAt: toISO(setting.updatedAt) ?? "",
      updatedBy: setting.updatedBy
    };
  }

  async getSettings(filters: SettingsListQuery): Promise<SettingDTO[]> {
    await this.initDefaults();

    let settings: Setting[];
    if (filters.category) {
      settings = await this.settingsRepository.findByCategory(filters.category as SettingCategory);
    } else {
      settings = await this.settingsRepository.findAll();
    }

    return settings.map((s) => this.toDTO(s));
  }

  async getSettingsGrouped(filters: SettingsListQuery): Promise<Record<string, SettingDTO[]>> {
    const settings = await this.getSettings(filters);
    const grouped: Record<string, SettingDTO[]> = {};

    for (const dto of settings) {
      if (!grouped[dto.category]) {
        grouped[dto.category] = [];
      }
      grouped[dto.category].push(dto);
    }

    return grouped;
  }

  async updateSettings(input: SettingsUpdateInput, actorRole: Role, actorUserId: string): Promise<SettingDTO[]> {
    await this.initDefaults();

    const updated: SettingDTO[] = [];

    for (const item of input.settings) {
      const existing = await this.settingsRepository.findById(item.key);
      if (!existing) {
        throw new NotFoundError(`Setting with key "${item.key}" was not found.`);
      }

      await this.settingsRepository.upsert({
        key: item.key,
        category: item.category as SettingCategory,
        value: item.value,
        description: item.description,
        updatedAt: new Date(),
        createdAt: existing.createdAt,
        updatedBy: actorUserId
      });

      const updatedSetting = await this.settingsRepository.findById(item.key);
      if (updatedSetting) {
        updated.push(this.toDTO(updatedSetting));
      }
    }

    await writeAuditLog(actorRole, "settings.updated", "settings", input.settings.map((s) => s.key).join(","));

    return updated;
  }
}
