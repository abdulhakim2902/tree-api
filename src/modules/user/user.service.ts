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
import { isVowel, parse } from 'src/helper/string';
import { NodeRepository } from '../node/node.repository';
import { ConnectNodeDto } from './dto/connect-node.dto';
import { UserProfile } from 'src/interfaces/user-profile.interface';

const TTL = 60 * 60; // 1HOUR

@Injectable()
export class UserService {
  private readonly prefix = 'user';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly nodeRepository: NodeRepository,
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
      nodeId: user.nodeId,
    };
  }

  async insert(data: CreateUserDto, token?: string): Promise<User> {
    try {
      if (!token) {
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

        const emailPayload = { token, type: 'registration', email };
        const str = JSON.stringify(payload);

        await this.redisService.set(this.prefix, token, str, TTL);
        await this.redisService.set(this.prefix, email, token, TTL);
        await this.mailService.sendEmailTo(to, emailPayload);
        return {} as User;
      }

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

      const { email, username } = data;

      const exist = await this.userRepository.findOne({
        $or: [{ email: email }, { username: username }],
      });

      if (exist) {
        throw new Error('Email/username already existed');
      }

      await this.redisService.del(this.prefix, token);
      await this.redisService.del(this.prefix, data.email);

      const user = await this.userRepository.insert(data);
      const notification = {
        read: false,
        type: NotificationType.INVITATION,
        message: `Welcome to the <b>Family Tree</b>. You are joining the tree as ${isVowel(
          user.role,
        )} <b>${user.role}</b>.`,
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
    const user = await this.userRepository.updateById(id, { $set: data });

    await this.redisService.del('auth', user.id);

    return user;
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

  async disconnectNode(userProfile: UserProfile, nodeId: string) {
    if (userProfile.nodeId !== nodeId) {
      throw new BadRequestException('Invalid node');
    }

    const user = await this.userRepository.findById(userProfile.id);
    if (!user.nodeId) {
      throw new BadRequestException('User node not found');
    }

    const node = await this.nodeRepository.findById(nodeId);

    if (!node.userId) {
      throw new BadRequestException('Node user not found');
    }

    await this.userRepository.updateById(userProfile.id, {
      $unset: { nodeId: '' },
    });

    await this.nodeRepository.updateById(nodeId, {
      $unset: { userId: '' },
    });

    await this.redisService.del('auth', user.id);

    return {
      message: 'Successfully disconnect node',
    };
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
          message: `Admin invited you to join the <b>Family Tree</b> as ${
            isVowel(e.role) ? 'an' : 'a'
          } <b>${e.role}</b>.`,
          to: toUser._id,
          action: true,
        };

        const str = JSON.stringify(data);

        await this.redisService.set(this.prefix, token, str);
        await this.redisService.set(this.prefix, e.email, token);

        notifications.push(
          this.notificationRepository.findAndModify(
            { referenceId: token, action: true },
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
      message: `<b>${startCase(
        fromUser.name,
      )}</b> is requesting to change the role from ${
        isVowel(fromUser.role) ? 'an' : 'a'
      } <b>${fromUser.role}</b> to ${isVowel(data.role) ? 'an' : 'a'} <b>${
        data.role
      }</b>.`,
      to: toUser._id,
      action: true,
    };

    const str = JSON.stringify(payload);

    await this.redisService.set(this.prefix, token, str);
    await this.notificationRepository.insert(notification);

    return {
      message: 'Successfully create request',
    };
  }

  async connectNode(id: string, data: ConnectNodeDto) {
    const { nodeId } = data;

    const cache = await this.redisService.get(this.prefix, `${id}:${nodeId}`);
    if (cache) {
      throw new BadRequestException('Request already sent');
    }

    const user = await this.userRepository.findById(id);
    if (user.nodeId) {
      throw new BadRequestException('Node already connected');
    }

    const userWithNode = await this.userRepository.findOne({ nodeId });
    if (userWithNode) {
      throw new BadRequestException('Node already connected');
    }

    const toUser = await this.userRepository.findOne({ role: Role.SUPERADMIN });
    if (!toUser) {
      throw new BadRequestException('Admin not found');
    }

    const node = await this.nodeRepository.findById(nodeId);
    const token = await this.generateOTP();
    const payload = {
      userId: user.id,
      nodeId: node.id,
      status: UserStatus.CONNECT_REQUEST,
    };

    const notification = {
      read: false,
      type: NotificationType.CONNECT,
      referenceId: token,
      additionalReferenceId: `${node.id}:${user.email}`,
      message: `<b>${user.email}</b> is requesting to connect <b>${startCase(
        node.fullname,
      )}</b>.`,
      to: toUser._id,
      action: true,
    };

    const str = JSON.stringify(payload);

    await this.redisService.set(this.prefix, token, str);
    await this.redisService.set(this.prefix, `${user.id}:${node.id}`, token);
    await this.notificationRepository.insert(notification);

    return {
      message: 'Successfully connect node',
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

  async handleConnectNode(token: string, action: RequestAction) {
    if (action === RequestAction.ACCEPT) {
      return this.acceptConnectNode(token);
    }

    if (action === RequestAction.REJECT) {
      return this.rejectConnectNode(token);
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
      message: `Admin <b>approved</b> your role changes to ${
        isVowel(toUser.role) ? 'an' : 'a'
      } <b>${toUser.role}</b>. Please sign in again to make changes.`,
      to: toUser._id,
      action: false,
    };

    await toUser.save();
    await this.redisService.del(this.prefix, token);
    await this.redisService.del('auth', toUser.id);
    await this.notificationRepository.insert(notification);
    await this.notificationRepository.updateMany(
      { referenceId: token },
      { $unset: { referenceId: '' }, action: false, read: true },
    );

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
      message: `Admin <b>rejected</b> your role changes to ${
        isVowel(toUser.role) ? 'an' : 'a'
      } <b>${toUser.role}</b>.`,
      to: toUser._id,
      action: false,
    };

    await this.redisService.del(this.prefix, token);
    await this.notificationRepository.insert(notification);
    await this.notificationRepository.updateMany(
      { referenceId: token },
      { $unset: { referenceId: '' }, action: false, read: true },
    );

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
    await this.redisService.del('auth', user.id);
    await this.notificationRepository.updateMany(
      { referenceId: token },
      { $unset: { referenceId: '' }, action: false, read: true },
    );

    const notification = {
      read: false,
      type: NotificationType.INVITATION,
      message: `You <b>accepted</b> role changes to ${
        isVowel(user.role) ? 'an' : 'a'
      } <b>${user.role}</b>.`,
      to: user._id,
      action: false,
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
    await this.notificationRepository.updateMany(
      { referenceId: token },
      { $unset: { referenceId: '' }, action: false, read: true },
    );

    const notification = {
      read: false,
      type: NotificationType.INVITATION,
      message: `You <b>rejected</b> role changes to ${
        isVowel(invitation.role) ? 'an' : 'a'
      }<b>${invitation.role}</b>.`,
      to: user._id,
      action: false,
    };

    return this.notificationRepository.insert(notification);
  }

  private async acceptConnectNode(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const request = parse<{
      userId: string;
      nodeId: string;
      status: UserStatus;
    }>(cache);
    if (!request) {
      throw new BadRequestException('Request not found');
    }

    if (request.status !== UserStatus.CONNECT_REQUEST) {
      throw new BadRequestException('Invalid request');
    }

    const user = await this.userRepository.findById(request.userId);
    const node = await this.nodeRepository.findById(request.nodeId);

    node.userId = user._id;
    user.nodeId = node._id;

    await user.save();
    await node.save();

    await this.redisService.del(this.prefix, token);
    await this.redisService.del(this.prefix, `${user.id}:${node.id}`);
    await this.redisService.del('auth', user.id);
    await this.notificationRepository.updateMany(
      { referenceId: token },
      { $unset: { referenceId: '' }, action: false, read: true },
    );

    const notification = {
      read: false,
      type: NotificationType.CONNECT,
      message: `Admin <b>approved</b> your connect request of ${startCase(
        node.fullname,
      )}. Please sign in again to make changes.`,
      to: user.id,
      action: false,
    };

    return this.notificationRepository.insert(notification);
  }

  private async rejectConnectNode(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const request = parse<{
      userId: string;
      nodeId: string;
      status: UserStatus;
    }>(cache);
    if (!request) {
      throw new BadRequestException('Request not found');
    }

    if (request.status !== UserStatus.CONNECT_REQUEST) {
      throw new BadRequestException('Request not found');
    }

    const user = await this.userRepository.findById(request.userId);
    const node = await this.nodeRepository.findById(request.nodeId);

    await this.redisService.del(this.prefix, token);
    await this.redisService.del(this.prefix, `${user.id}:${node.id}`);
    await this.notificationRepository.updateMany(
      { referenceId: token },
      { $unset: { referenceId: '' }, action: false, read: true },
    );

    const notification = {
      read: false,
      type: NotificationType.CONNECT,
      message: `Admin <b>rejected</b> your connect request of ${startCase(
        node.fullname,
      )}`,
      to: user.id,
      action: false,
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
