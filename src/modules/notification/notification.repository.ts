import { InjectModel } from '@nestjs/mongoose';
import { Notification } from './notification.schema';
import { FilterQuery, Model } from 'mongoose';
import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
      const notifications = await this.notification
        .find(filter)
        .sort({ createdAt: -1 })
        .exec();
      return notifications;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async count(filter: FilterQuery<Notification>): Promise<{ count: number }> {
    try {
      const total = await this.notification.count(filter).exec();
      return { count: total };
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async updateMany(
    filter: FilterQuery<Notification>,
    data: Record<string, any>,
  ) {
    try {
      const result = await this.notification.updateMany(filter, data).exec();
      return result;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async findAndModify(
    filter: FilterQuery<Notification>,
    update: Record<string, any>,
  ): Promise<Notification> {
    try {
      const request = await this.notification.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });

      return request;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async bulkSave(data: Notification[]) {
    try {
      const result = await this.notification.bulkSave(data);
      return result;
    } catch (err) {
      throw new UnprocessableEntityException(err.message);
    }
  }
}
