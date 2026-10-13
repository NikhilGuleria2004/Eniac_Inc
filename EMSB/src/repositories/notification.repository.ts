import type { Collection, Filter } from "mongodb";
import type { Notification, NotificationType } from "../models/notification.js";
import { getCollection } from "../config/database.js";

export interface NotificationListFilters {
  userId?: string;
  type?: NotificationType;
  read?: boolean;
  page?: number;
  pageSize?: number;
}

export class NotificationRepository {
  private get collection(): Collection<Notification> {
    return getCollection<Notification>("notifications");
  }

  async findById(notificationId: string): Promise<Notification | null> {
    return this.collection.findOne({ notificationId });
  }

  async findMany(
    filters: NotificationListFilters
  ): Promise<{ notifications: Notification[]; total: number }> {
    const { page = 1, pageSize = 20, ...queryFilters } = filters;
    const query: Filter<Notification> = {};

    if (queryFilters.userId) {
      query.userId = queryFilters.userId;
    }
    if (queryFilters.type) {
      query.type = queryFilters.type;
    }
    if (queryFilters.read !== undefined) {
      query.read = queryFilters.read;
    }

    const skip = (page - 1) * pageSize;

    const [notifications, total] = await Promise.all([
      this.collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      this.collection.countDocuments(query)
    ]);

    return { notifications, total };
  }

  async countUnread(userId: string): Promise<number> {
    return this.collection.countDocuments({ userId, read: false });
  }

  async getUnreadCountByUser(userId: string): Promise<number> {
    return this.countUnread(userId);
  }

  async create(notification: Omit<Notification, "_id">): Promise<Notification> {
    const { ObjectId } = await import("mongodb");
    const result = await this.collection.insertOne({
      ...notification,
      _id: new ObjectId()
    });
    return { ...notification, _id: result.insertedId };
  }

  async markRead(notificationId: string): Promise<Notification | null> {
    await this.collection.updateOne(
      { notificationId },
      { $set: { read: true, readAt: new Date(), updatedAt: new Date() } }
    );
    return this.findById(notificationId);
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.collection.updateMany(
      { userId, read: false },
      { $set: { read: true, readAt: new Date(), updatedAt: new Date() } }
    );
    return result.modifiedCount;
  }

  async delete(notificationId: string): Promise<void> {
    await this.collection.deleteOne({ notificationId });
  }
}
