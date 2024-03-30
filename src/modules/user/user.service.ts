import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from 'src/modules/user/user.schema';
import { UserRepository } from 'src/modules/user/user.repository';
import { Role } from 'src/enums/role.enum';
import { InviteRequestUserDto } from './dto/invite-request-user.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { UserStatus } from 'src/enums/user-status.enum';
import { MailService } from '../mail/mail.service';
import { UserInvitation } from 'src/interfaces/user-invitations';
import { UpdateUserRoleDto } from './dto/update-role-user.dto';

const TTL = 60 * 60 * 1000; // 1HOUR

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailService: MailService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async insert(data: CreateUserDto, token?: string): Promise<User> {
    try {
      if (token) {
        const cache = await this.cacheManager.get<UserInvitation>(token);
        if (!cache) {
          throw new BadRequestException('Expired token');
        }

        if (cache.status !== UserStatus.NEW_USER) {
          throw new BadRequestException('Invalid token');
        }

        data.email = cache.email;
        data.role = cache.role;

        await this.cacheManager.del(token);
      }

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

  async updateRole(data: UpdateUserRoleDto) {
    const cache = await this.cacheManager.get<UserInvitation>(data.token);
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
    await this.cacheManager.del(data.token);

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
      const { email } = e;
      const user = await this.userRepository.findOne({ email });

      // Generate unique token
      let token = this.generateOTP(20);
      while (true) {
        const data = await this.cacheManager.get(token);
        if (!data) break;
        token = this.generateOTP(20);
      }

      console.log(token);
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

      await this.cacheManager.set(token, data, TTL);
      await this.mailService.sendEmailTo(to, token, 'invites', e.role);
    }

    return {
      message: 'Successfully send invitations',
    };
  }

  async request(data: InviteRequestUserDto) {
    const superadmin = await this.userRepository.findOne({
      role: Role.SUPERADMIN,
    });

    const to = superadmin.email;
    const payload = data;

    console.log(to, payload);

    // send notification to superadmin
  }

  private generateOTP(size: number): string {
    return crypto.randomBytes(size).toString('hex');
  }
}
