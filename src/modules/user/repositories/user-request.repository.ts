import { InjectModel } from '@nestjs/mongoose';
import { UserRequest } from '../schemas/user-request.schema';
import { FilterQuery, Model } from 'mongoose';
import { BadRequestException } from '@nestjs/common';

export class UserRequestRepository {
  constructor(
    @InjectModel(UserRequest.name)
    private readonly userRequest: Model<UserRequest>,
  ) {}

  async find(filter: FilterQuery<UserRequest>): Promise<UserRequest[]> {
    try {
      const userRequests = await this.userRequest.find(filter);
      return userRequests;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async deleteMany(filter: FilterQuery<UserRequest>) {
    try {
      await this.userRequest.deleteMany(filter);
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async findAndModify(
    filter: FilterQuery<UserRequest>,
    update: Record<string, any>,
  ): Promise<UserRequest> {
    try {
      const request = await this.userRequest.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });

      return request;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}
