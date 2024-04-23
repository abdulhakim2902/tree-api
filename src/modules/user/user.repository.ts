import { InjectModel } from '@nestjs/mongoose';
import { Model, UpdateQuery } from 'mongoose';
import { CreateUserDto } from './dto';
import { User } from 'src/modules/user/user.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';

export class UserRepository {
  constructor(@InjectModel(User.name) private readonly user: Model<User>) {}

  async insert(data: CreateUserDto): Promise<User> {
    try {
      const user = await this.user.create(data);
      return user;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async findById(id: string): Promise<User> {
    let user: User;

    try {
      user = await this.user.findById(id).exec();
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOne(query: UpdateQuery<User>): Promise<User | null> {
    try {
      const user = await this.user.findOne(query).exec();
      return user;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async updateById(id: string, data: UpdateQuery<User>): Promise<User> {
    let user: User;

    try {
      user = await this.user.findByIdAndUpdate(id, data, { new: true }).exec();
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateOne(
    filter: Record<string, any>,
    data: Record<string, any>,
  ): Promise<User | null> {
    try {
      const user = await this.user
        .findOneAndUpdate(filter, data, { new: true })
        .exec();
      return user;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }
}
