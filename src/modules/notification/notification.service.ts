import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { Notification } from './notification.schema';
import mongoose from 'mongoose';
import { UpdateNotificationDto } from './dto/update-notification';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async find(id: string, query: QueryNotificationDto): Promise<Notification[]> {
    const to = new mongoose.Types.ObjectId(id);
    const updatedQuery = {};

    if (query.read) {
      Object.assign(updatedQuery, { read: query.read === 'true' });
    }

    return this.notificationRepository.find({ to, ...updatedQuery });
  }

  async count(
    id: string,
    query: QueryNotificationDto,
  ): Promise<{ count: number }> {
    const to = new mongoose.Types.ObjectId(id);
    const updatedQuery = { to };

    if (query.read) {
      Object.assign(updatedQuery, { read: query.read === 'true' });
    }

    return this.notificationRepository.count(updatedQuery);
  }

  async patch(to: string, notificationId: string, data: UpdateNotificationDto) {
    const notifications = await this.notificationRepository.find({
      _id: new mongoose.Types.ObjectId(notificationId),
    });

    if (notifications.length <= 0) {
      throw new BadRequestException('Notification not found');
    }

    const filter = {
      $or: [
        { _id: new mongoose.Types.ObjectId(notificationId) },
        { relatedModelId: notifications[0].relatedModelId },
      ],
      to: new mongoose.Types.ObjectId(to),
    };

    if (notifications[0].relatedModelId) {
      Object.assign(filter, {
        relatedModelId: notifications[0].relatedModelId,
      });
    } else {
      Object.assign(filter, {
        _id: new mongoose.Types.ObjectId(notificationId),
      });
    }

    return this.notificationRepository.updateMany(filter, {
      $set: {
        ...data,
        read: true,
      },
    });
  }
}
