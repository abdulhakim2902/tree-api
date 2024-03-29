import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from 'src/modules/user/user.schema';
import { UserRepository } from 'src/modules/user/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async insert(data: CreateUserDto): Promise<User> {
    try {
      const user = await this.userRepository.insert(data);
      return user;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async me(id: string) {
    const user = await this.userRepository.findById(id);
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    };
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return this.userRepository.updateById(id, { $set: data });
  }

  async findOne(filter: Record<string, any>): Promise<User> {
    return this.userRepository.findOne(filter);
  }

  async updateById(id: string, update: Record<string, any>) {
    await this.userRepository.updateOne({ _id: id }, update);
  }
}
