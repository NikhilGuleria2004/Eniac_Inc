import type { Request, Response, NextFunction } from "express";
import { NotificationService } from "../services/notification.service.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { successResponse, paginatedResponse } from "../utils/response.js";
import { formatZodError } from "../utils/validation.js";
import { ValidationError } from "../utils/errors.js";
import { notificationListQuerySchema } from "../schemas/notification.schemas.js";

function getNotificationService(): NotificationService {
  return new NotificationService(
    new NotificationRepository(),
    new UserRepository()
  );
}

export const notificationController = {
  list: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = notificationListQuerySchema.safeParse(req.query);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        throw new ValidationError(formatted.message, formatted.fields);
      }

      const service = getNotificationService();
      const { notifications, total, page, pageSize } = await service.listNotifications(
        req.user?.userId ?? "",
        result.data
      );

      res.json(paginatedResponse(notifications, page, pageSize, total));
    } catch (error) {
      next(error);
    }
  },

  getUnreadCount: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getNotificationService();
      const result = await service.getUnreadCount(req.user?.userId ?? "");
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  },

  markRead: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getNotificationService();
      const notification = await service.markRead(
        req.params.notificationId,
        req.user?.userId ?? ""
      );
      res.json(successResponse(notification));
    } catch (error) {
      next(error);
    }
  },

  markAllRead: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const service = getNotificationService();
      const result = await service.markAllRead(req.user?.userId ?? "");
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }
};
