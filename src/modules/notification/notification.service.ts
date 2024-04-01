import { Injectable } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { Notification } from './notification.schema';
import mongoose from 'mongoose';
import { UpdateNotificationDto } from './dto/update-notification';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async find(id: string): Promise<Notification[]> {
    const to = new mongoose.Types.ObjectId(id);
    return this.notificationRepository.find({ to });
  }

  async patch(to: string, notificationId: string, data: UpdateNotificationDto) {
    await this.notificationRepository.updateMany(
      {
        id: notificationId,
        to: new mongoose.Types.ObjectId(to),
      },
      {
        ...data,
        read: true,
      },
    );
  }
}
