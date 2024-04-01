import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from 'src/modules/user/schemas/user.schema';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { Role } from 'src/enums/role.enum';
import {
  InviteRequestUserDto,
  InviteRequestUserRoleDto,
} from './dto/invite-request-user.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { UserStatus } from 'src/enums/user-status.enum';
import { MailService } from '../mail/mail.service';
import { UserInvitation } from 'src/interfaces/user-invitations';
import { UserRequestRepository } from './repositories/user-request.repository';
import { UserRequest } from './schemas/user-request.schema';
import { RequestAction } from 'src/enums/request-action';

const TTL = 60 * 60 * 1000; // 1HOUR

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRequestRepository: UserRequestRepository,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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

  async insert(data: CreateUserDto, token?: string): Promise<User> {
    try {
      if (token) {
        const cache = await this.cacheManager.get<UserInvitation>(token);
        if (!cache) {
          throw new BadRequestException('Expired token');
        }

        if (
          ![UserStatus.NEW_USER, UserStatus.REGISTRATION].includes(cache.status)
        ) {
          throw new BadRequestException('Invalid token');
        }

        data.email = cache.email;
        data.role = cache.role;
        if (cache.name) data.name = cache.name;
        if (cache.username) data.username = cache.username;
        if (cache.password) data.password = cache.password;

        await this.cacheManager.del(token);
      } else {
        const { email, username } = data;
        const exist = await this.userRepository.findOne({
          $or: [{ email }, { username }],
        });

        if (exist) {
          throw new Error('Email/username already existed');
        }

        const to = email;
        const token = await this.generateOTP();
        const payload = {
          name: data.name,
          username: data.username,
          password: data.password,
          email: email,
          role: Role.GUEST,
          status: UserStatus.REGISTRATION,
        };

        const emailPayload = { token, type: 'registration' };

        await this.cacheManager.set(token, payload, TTL);
        await this.mailService.sendEmailTo(to, emailPayload);
        return {} as User;
      }

      const user = await this.userRepository.insert(data);
      return user;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
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

  async acceptInvitation(token: string) {
    const cache = await this.cacheManager.get<UserInvitation>(token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    if (cache.status !== UserStatus.ROLE_UPDATE) {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.userRepository.findOne({ email: cache.email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role === Role.SUPERADMIN) {
      throw new BadRequestException('Superadmin role cannot be changed');
    }

    user.role = cache.role;
    await user.save();
    await this.cacheManager.del(token);

    return {
      message: 'User role is updated',
    };
  }

  async revoke(id: string) {
    const user = await this.userRepository.findById(id);
    if (user.role === Role.SUPERADMIN) {
      throw new BadRequestException('Superadmin cannot be revoked');
    }

    user.role = Role.GUEST;
    const updated = await user.save();

    // TODO: send mail information

    return updated;
  }

  async invites(data: InviteRequestUserDto[]) {
    for (const e of data) {
      const user = await this.userRepository.findOne({ email: e.email });
      const token = await this.generateOTP();

      let status = UserStatus.NEW_USER;
      if (user) {
        status = UserStatus.ROLE_UPDATE;
      }

      const to = e.email;
      const data = {
        email: e.email,
        role: e.role,
        status: status,
      };

      const emailPayload = { token, type: 'invites', role: e.role };

      await this.cacheManager.set(token, data, TTL);
      await this.mailService.sendEmailTo(to, emailPayload);
    }

    return {
      message: 'Successfully send invitations',
    };
  }

  async requests(): Promise<UserRequest[]> {
    return this.userRequestRepository.find({});
  }

  async handleRequest(id: string, action: RequestAction) {
    if (action === RequestAction.ACCEPT) {
      return this.acceptRequest(id);
    }

    if (action === RequestAction.REJECT) {
      return this.rejectRequest(id);
    }

    throw new BadRequestException('Invalid handle request');
  }

  async createRequest(email: string, data: InviteRequestUserRoleDto) {
    const user = await this.userRepository.findOne({ role: Role.SUPERADMIN });
    if (!user) {
      throw new BadRequestException('Admin not found');
    }

    const from = email;
    const to = user.email;
    const payload = {
      email: email,
      currentRole: user.role,
      requestedRole: data.role,
    };

    const fromPayload = { role: data.role, email: email };
    const toPayload = {
      role: Role.SUPERADMIN,
      email: email,
      additionalRole: data.role,
    };

    await Promise.all([
      this.mailService.sendEmailTo(from, fromPayload),
      this.mailService.sendEmailTo(to, toPayload),
      this.userRequestRepository.findAndModify({ email }, payload),
    ]);

    return {
      message: 'Request has been made',
    };
  }

  async acceptRequest(id: string) {
    const requests = await this.userRequestRepository.find({ _id: id });
    if (requests.length <= 0) {
      throw new BadRequestException('Request not found');
    }

    const request = requests[0];

    const user = await this.userRepository.findOne({ email: request.email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role === Role.SUPERADMIN) {
      await this.userRequestRepository.deleteMany({ id });
      throw new BadRequestException('Superadmin cannot be changed');
    }

    user.role = request.requestedRole;
    await user.save();
    await this.userRequestRepository.deleteMany({ _id: id });

    // TODO: send email

    return {
      message: 'Request is accepted',
    };
  }

  async rejectRequest(id: string) {
    const requests = await this.userRequestRepository.find({ _id: id });
    if (requests.length <= 0) {
      throw new BadRequestException('Request not found');
    }

    await this.userRequestRepository.deleteMany({ _id: id });

    // TODO: send email

    return {
      message: 'Request is rejected',
    };
  }

  async getInvitation(token: string): Promise<UserInvitation> {
    const cache = await this.cacheManager.get<UserInvitation>(token);
    if (!cache) {
      throw new BadRequestException('Invitation not found');
    }

    return cache;
  }

  private async generateOTP(size = 20): Promise<string> {
    let token = crypto.randomBytes(size).toString('hex');
    while (true) {
      const data = await this.cacheManager.get(token);
      if (!data) break;
      token = crypto.randomBytes(size).toString('hex');
    }

    return token;
  }
}
