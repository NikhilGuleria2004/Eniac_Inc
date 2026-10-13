import type { Collection, Filter } from "mongodb";
import type { Setting } from "../models/settings.js";
import { getCollection } from "../config/database.js";
import type { SettingCategory } from "../config/constants.js";

export class SettingsRepository {
  private get collection(): Collection<Setting> {
    return getCollection<Setting>("settings");
  }

  async findById(key: string): Promise<Setting | null> {
    return this.collection.findOne({ key });
  }

  async findByCategory(category: SettingCategory): Promise<Setting[]> {
    return this.collection.find({ category }).sort({ key: 1 }).toArray();
  }

  async findAll(): Promise<Setting[]> {
    return this.collection.find({}).sort({ category: 1, key: 1 }).toArray();
  }

  async findByCategories(categories: SettingCategory[]): Promise<Setting[]> {
    const query: Filter<Setting> = { category: { $in: categories } };
    return this.collection.find(query).sort({ category: 1, key: 1 }).toArray();
  }

  async upsert(setting: Omit<Setting, "_id">): Promise<Setting> {
    const { ObjectId } = await import("mongodb");
    const now = new Date();
    const { createdAt, ...rest } = setting;
    await this.collection.updateOne(
      { key: setting.key },
      {
        $set: {
          ...rest,
          updatedAt: now
        },
        $setOnInsert: {
          _id: new ObjectId(),
          createdAt: createdAt ?? now
        }
      },
      { upsert: true }
    );
    return this.findById(setting.key).then((r) => r!);
  }

  async upsertMany(settings: Omit<Setting, "_id">[]): Promise<void> {
    for (const setting of settings) {
      await this.upsert(setting);
    }
  }
}
