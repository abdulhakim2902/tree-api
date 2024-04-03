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

  async patch(to: string, notificationId: string) {
    const filter = {
      _id: new mongoose.Types.ObjectId(notificationId),
      to: new mongoose.Types.ObjectId(to),
    };

    return this.notificationRepository.updateMany(filter, {
      $set: {
        read: true,
      },
    });
  }
}
