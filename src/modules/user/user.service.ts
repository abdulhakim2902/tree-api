import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from 'src/modules/user/user.schema';
import { UserRepository } from 'src/modules/user/user.repository';
import { Role } from 'src/enums/role.enum';
import {
  InviteRequestUserDto,
  InviteRequestUserRoleDto,
} from './dto/invite-request-user.dto';
import * as crypto from 'crypto';
import { UserStatus } from 'src/enums/user-status.enum';
import { MailService } from '../mail/mail.service';
import { UserInvitation } from 'src/interfaces/user-invitations';
import { RequestAction } from 'src/enums/request-action';
import { NotificationType } from 'src/enums/notification-type.enum';
import { startCase } from 'lodash';
import { NotificationRepository } from '../notification/notification.repository';
import { RedisService } from '../redis/redis.service';
import { parse } from 'src/helper/string';

const TTL = 60 * 60; // 1HOUR

@Injectable()
export class UserService {
  private readonly prefix = 'user';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
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
        const cache = await this.redisService.get(this.prefix, token);
        if (!cache) {
          throw new BadRequestException('Expired token');
        }

        const invitation = parse<UserInvitation>(cache);
        if (!invitation) {
          throw new BadRequestException('Invalid data');
        }

        if (
          ![UserStatus.NEW_USER, UserStatus.REGISTRATION].includes(
            invitation.status,
          )
        ) {
          throw new BadRequestException('Invalid token');
        }

        data.email = invitation.email;
        data.role = invitation.role;
        if (invitation.name) data.name = invitation.name;
        if (invitation.username) data.username = invitation.username;
        if (invitation.password) data.password = invitation.password;

        await this.redisService.del(this.prefix, token);
        await this.redisService.del(this.prefix, data.email);
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
        const str = JSON.stringify(payload);

        await this.redisService.set(this.prefix, token, str, TTL);
        await this.redisService.set(this.prefix, email, token, TTL);
        await this.mailService.sendEmailTo(to, emailPayload);
        return {} as User;
      }

      const user = await this.userRepository.insert(data);
      const notification = {
        read: false,
        referenceId: token,
        type: NotificationType.INVITATION,
        message: `Welcome to the Family Tree. You are joining the tree as ${
          ['a', 'i', 'u', 'e', 'o'].includes(user.role) ? 'an' : 'a'
        } ${user.role}.`,
        to: user._id,
        action: false,
      };

      await this.notificationRepository.insert(notification);

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

  async revoke(id: string) {
    const user = await this.userRepository.findById(id);
    if (user.role === Role.SUPERADMIN) {
      throw new BadRequestException('Superadmin cannot be revoked');
    }

    user.role = Role.GUEST;
    const updated = await user.save();

    return updated;
  }

  async invitation(token: string): Promise<UserInvitation> {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Invitation not found');
    }

    const data = parse<UserInvitation>(cache);
    if (!data) {
      throw new BadRequestException('Invitation not found');
    }

    return data;
  }

  async createInvitation(data: InviteRequestUserDto[]) {
    const notifications = [];
    for (const e of data) {
      const toUser = await this.userRepository.findOne({ email: e.email });

      let token = await this.generateOTP();
      let status = UserStatus.NEW_USER;
      if (toUser) {
        status = UserStatus.ROLE_UPDATE;
      }

      let data = {
        email: e.email,
        role: e.role,
        status: status,
      } as UserInvitation;

      if (status === UserStatus.NEW_USER) {
        const to = e.email;
        const emailPayload = { token, type: 'invites', role: e.role };
        const str = JSON.stringify(data);

        await this.mailService.sendEmailTo(to, emailPayload);
        await this.redisService.set(this.prefix, token, str, TTL);
        await this.redisService.set(this.prefix, e.email, token, TTL);
      } else {
        const currentToken = await this.redisService.get(this.prefix, e.email);
        if (currentToken) {
          const dataStr = await this.redisService.get(
            this.prefix,
            currentToken,
          );
          const dataParse = parse<UserInvitation>(dataStr);
          if (dataParse) {
            data = dataParse;
            token = currentToken;
            data.role = e.role;
          }
        }
        const notification = {
          read: false,
          referenceId: token,
          type: NotificationType.INVITATION,
          message: `Admin invited you to join the Family Tree as ${
            ['a', 'i', 'u', 'e', 'o'].includes(e.role) ? 'an' : 'a'
          } ${e.role}.`,
          to: toUser._id,
          action: false,
        };

        const str = JSON.stringify(data);

        await this.redisService.set(this.prefix, token, str);
        await this.redisService.set(this.prefix, e.email, token);

        notifications.push(
          this.notificationRepository.findAndModify(
            { referenceId: token },
            notification,
          ),
        );
      }
    }

    await Promise.all(notifications);

    return {
      message: 'Successfully create invitation',
    };
  }

  async createRequest(email: string, data: InviteRequestUserRoleDto) {
    const toUser = await this.userRepository.findOne({ role: Role.SUPERADMIN });
    if (!toUser) {
      throw new BadRequestException('Admin not found');
    }

    const fromUser = await this.userRepository.findOne({ email });
    const token = await this.generateOTP();
    const payload = {
      email: email,
      role: data.role,
      status: UserStatus.ROLE_REQUEST,
    };

    const notification = {
      read: false,
      type: NotificationType.REQUEST,
      referenceId: token,
      message: `${startCase(
        fromUser.name,
      )} is requesting to change the role from ${fromUser.role} to ${
        data.role
      }.`,
      to: toUser._id,
      action: false,
    };

    const str = JSON.stringify(payload);

    await this.redisService.set(this.prefix, token, str);
    await this.notificationRepository.insert(notification);

    return {
      message: 'Successfully create request',
    };
  }

  async handleInvitation(token: string, action: RequestAction) {
    if (action === RequestAction.ACCEPT) {
      return this.acceptInvitation(token);
    }

    if (action === RequestAction.REJECT) {
      return this.rejectInvitation(token);
    }

    throw new BadRequestException('Invalid handle request');
  }

  async handleRequest(token: string, action: RequestAction) {
    if (action === RequestAction.ACCEPT) {
      return this.acceptRequest(token);
    }

    if (action === RequestAction.REJECT) {
      return this.rejectRequest(token);
    }

    throw new BadRequestException('Invalid handle request');
  }

  private async acceptRequest(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const request = parse<UserInvitation>(cache);
    if (!request) {
      throw new BadRequestException('Request not found');
    }

    const toUser = await this.userRepository.findOne({ email: request.email });
    if (!toUser) {
      throw new BadRequestException('User not found');
    }

    if (toUser.role === Role.SUPERADMIN) {
      throw new BadRequestException('Superadmin cannot be changed');
    }

    toUser.role = request.role;

    const notification = {
      read: false,
      type: NotificationType.REQUEST,
      message: `Admin approved your role changes to ${toUser.role}. Please sign in again to make changes.`,
      to: toUser._id,
      action: true,
    };

    await toUser.save();
    await this.redisService.del(this.prefix, token);
    await this.notificationRepository.insert(notification);

    return {
      message: 'Successfully accept request',
    };
  }

  private async rejectRequest(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const request = parse<UserInvitation>(cache);
    if (!request) {
      throw new BadRequestException('Request not found');
    }

    const toUser = await this.userRepository.findOne({ email: request.email });
    const notification = {
      read: false,
      type: NotificationType.REQUEST,
      message: `Admin rejected your role changes to ${toUser.role}`,
      to: toUser._id,
      action: true,
    };

    await this.redisService.del(this.prefix, token);
    await this.notificationRepository.insert(notification);

    return {
      message: 'Successfully reject request',
    };
  }

  private async acceptInvitation(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const invitation = parse<UserInvitation>(cache);
    if (!invitation) {
      throw new BadRequestException('Invitation not found');
    }

    if (invitation.status !== UserStatus.ROLE_UPDATE) {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.userRepository.findOne({ email: invitation.email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role === Role.SUPERADMIN) {
      await this.redisService.del(this.prefix, token);
      throw new BadRequestException('Superadmin role cannot be changed');
    }

    user.role = invitation.role;
    await user.save();
    await this.redisService.del(this.prefix, token);
    await this.redisService.del(this.prefix, invitation.email);

    const notification = {
      read: false,
      type: NotificationType.INVITATION,
      message: `You accepted role changes to ${user.role}`,
      to: user._id,
      action: true,
    };

    return this.notificationRepository.insert(notification);
  }

  private async rejectInvitation(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const invitation = parse<UserInvitation>(cache);
    if (!invitation) {
      throw new BadRequestException('Invitation not found');
    }

    const user = await this.userRepository.findOne({ email: invitation.email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.redisService.del(this.prefix, token);
    await this.redisService.del(this.prefix, invitation.email);

    const notification = {
      read: false,
      type: NotificationType.INVITATION,
      message: `You rejected role changes to ${invitation.role}`,
      to: user._id,
      action: true,
    };

    return this.notificationRepository.insert(notification);
  }

  private async generateOTP(size = 20): Promise<string> {
    let token = crypto.randomBytes(size).toString('hex');
    while (true) {
      const data = await this.redisService.get(this.prefix, token);
      if (!data) break;
      token = crypto.randomBytes(size).toString('hex');
    }

    return token;
  }
}
