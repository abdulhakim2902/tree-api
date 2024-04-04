import { Injectable } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { Notification } from './notification.schema';
import mongoose from 'mongoose';
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

  async read(to: string, notificationId?: string) {
    const filter = {
      to: new mongoose.Types.ObjectId(to),
    };

    if (notificationId) {
      Object.assign(filter, {
        _id: new mongoose.Types.ObjectId(notificationId),
      });
    }

    return this.notificationRepository.updateMany(filter, {
      $set: {
        read: true,
      },
    });
  }
}
