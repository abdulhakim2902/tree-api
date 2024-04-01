import { InjectModel } from '@nestjs/mongoose';
import { Notification } from './notification.schema';
import { FilterQuery, Model } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import { CreateNotification } from 'src/interfaces/notification.interface';

export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notification: Model<Notification>,
  ) {}

  async insert(data: CreateNotification): Promise<Notification> {
    try {
      const notification = await this.notification.create(data);
      return notification;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async find(filter: FilterQuery<Notification>): Promise<Notification[]> {
    try {
      const notifications = await this.notification.find(filter);
      return notifications;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async updateMany(
    filter: FilterQuery<Notification>,
    data: Record<string, any>,
  ) {
    try {
      await this.notification.updateMany(filter, data);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}
