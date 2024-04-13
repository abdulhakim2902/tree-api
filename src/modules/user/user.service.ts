import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
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
import {
  ConnectRequest,
  UserInvitation,
  UserToken,
} from 'src/interfaces/user-invitations';
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
    // If token not exists, user is doing self registration
    if (!token) {
      const toUser = await this.userRepository.findOne({
        role: Role.SUPERADMIN,
      });
      if (!toUser) {
        throw new BadRequestException('Admin not found');
      }

      const { email, username } = data;
      const exist = await this.userRepository.findOne({
        $or: [{ email }, { username }],
      });

      if (exist) {
        throw new BadRequestException('Email/username already existed');
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
        verified: { user: false, admin: false },
      };

      const emailPayload = { token, type: 'registration', email };
      const payloadStr = JSON.stringify(payload);

      await this.redisService.set(this.prefix, token, payloadStr, TTL);
      await this.redisService.set(this.prefix, email, token, TTL);
      await this.redisService.set(this.prefix, username, token, TTL);

      await this.mailService.sendEmailTo(to, emailPayload);

      const notification = {
        read: false,
        type: NotificationType.REGISTRATION,
        referenceId: token,
        message: `<b>${username}</b> is requesting to verify the email ${email}`,
        to: toUser._id,
        action: true,
      };

      await this.notificationRepository.insert(notification);

      return {} as User;
    }

    // Email verification via token
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      await this.handleRemoveToken(token);
      throw new BadRequestException('Expired token');
    }

    const invitation = parse<UserInvitation>(cache);
    if (!invitation) {
      await this.handleRemoveToken(token);
      throw new BadRequestException('Invalid data');
    }

    if (
      ![UserStatus.NEW_USER, UserStatus.REGISTRATION].includes(
        invitation.status,
      )
    ) {
      throw new BadRequestException('Invalid token');
    }

    // Double verification by user and admin, if the registration
    // not through invitation by the admin
    if (invitation.status === UserStatus.REGISTRATION) {
      if (!invitation?.verified?.admin) {
        invitation.verified.user = true;

        const payloadStr = JSON.stringify(invitation);

        await this.redisService.set(this.prefix, token, payloadStr);
        await this.redisService.set(this.prefix, invitation.email, token);
        await this.redisService.set(this.prefix, invitation.username, token);

        throw new UnprocessableEntityException(
          'Please wait for admin to verify your email',
        );
      }
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

    await this.redisService.del(this.prefix, token);
    await this.redisService.del(this.prefix, data.email);
    await this.redisService.del(this.prefix, data.username);

    if (exist) {
      throw new BadRequestException('Email/username already existed');
    }

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

  async invitation(token: string): Promise<UserInvitation> {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Invitation not found');
    }

    const data = parse<UserInvitation>(cache);
    if (!data) {
      throw new BadRequestException('Invitation not found');
    }

    if (
      data.status === UserStatus.NEW_USER ||
      data.status === UserStatus.REGISTRATION
    ) {
      return data;
    }

    throw new BadRequestException('Invitation not found');
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

      const data = { email: e.email, role: e.role, status };

      if (status === UserStatus.NEW_USER) {
        const currentToken = await this.redisService.get(this.prefix, e.email);
        if (currentToken) {
          await this.redisService.del(this.prefix, currentToken);
        }

        const to = e.email;
        const emailPayload = { token, type: 'invites', role: e.role };
        const str = JSON.stringify(data);

        await this.mailService.sendEmailTo(to, emailPayload);
        await this.redisService.set(this.prefix, token, str, TTL);
        await this.redisService.set(this.prefix, e.email, token, TTL);
      } else {
        const cache = await this.redisService.get(this.prefix, toUser.id);
        const tokens = parse<UserToken>(cache) ?? {};
        const current = tokens[UserStatus.ROLE_UPDATE];
        if (current) {
          const dataStr = await this.redisService.get(this.prefix, current);
          const dataParse = parse<UserInvitation>(dataStr);
          if (dataParse) {
            token = current;

            data.role = e.role;
            data.email = dataParse.email;
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

        tokens[UserStatus.ROLE_UPDATE] = token;

        const payloadStr = JSON.stringify(data);
        const tokensStr = JSON.stringify(tokens);

        await this.redisService.set(this.prefix, token, payloadStr);
        await this.redisService.set(this.prefix, toUser.id, tokensStr);

        notifications.push(
          this.notificationRepository.findAndModify(
            {
              referenceId: token,
              read: false,
              type: NotificationType.INVITATION,
            },
            notification,
          ),
        );
      }
    }

    await Promise.all(notifications);

    return {
      message: 'Invitation is sent',
    };
  }

  async createRequest(id: string, data: InviteRequestUserRoleDto) {
    const toUser = await this.userRepository.findOne({ role: Role.SUPERADMIN });
    if (!toUser) {
      throw new BadRequestException('Admin not found');
    }

    const cache = await this.redisService.get(this.prefix, id);
    const tokens = parse<UserToken>(cache) ?? {};
    const currentToken = tokens?.[UserStatus.ROLE_REQUEST];
    const token = currentToken ?? (await this.generateOTP());

    const fromUser = await this.userRepository.findById(id);
    const payload = {
      email: fromUser.email,
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

    tokens[UserStatus.ROLE_REQUEST] = token;

    const payloadStr = JSON.stringify(payload);
    const tokensStr = JSON.stringify(tokens);

    await this.redisService.set(this.prefix, token, payloadStr);
    await this.redisService.set(this.prefix, id, tokensStr);
    await this.notificationRepository.findAndModify(
      { referenceId: token, read: false, type: NotificationType.REQUEST },
      notification,
    );

    return {
      message: 'Request is sent',
    };
  }

  async connectNode(id: string, data: ConnectNodeDto) {
    const { nodeId } = data;

    const cache = await this.redisService.get(this.prefix, id);
    const tokens = parse<UserToken>(cache) ?? {};
    const currentToken = tokens?.[UserStatus.CONNECT_REQUEST];
    if (currentToken) {
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
    const status = UserStatus.CONNECT_REQUEST;
    const payload = { userId: user.id, nodeId: node.id, status };

    const notification = {
      read: false,
      type: NotificationType.CONNECT,
      referenceId: token,
      additionalReferenceId: `${node.id}:${user.email}:${user.name}`,
      message: `<b>${startCase(
        user.name,
      )}</b> is requesting to connect <b>${startCase(
        node.fullname,
      )}</b> node profile.`,
      to: toUser._id,
      action: true,
    };

    tokens[UserStatus.CONNECT_REQUEST] = token;

    const payloadStr = JSON.stringify(payload);
    const tokensStr = JSON.stringify(tokens);

    await this.redisService.set(this.prefix, token, payloadStr);
    await this.redisService.set(this.prefix, id, tokensStr);
    await this.notificationRepository.insert(notification);

    return {
      message: 'Connect request is sent',
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

  async handleRegistration(token: string, action: RequestAction) {
    if (action === RequestAction.ACCEPT) {
      return this.acceptRegistration(token);
    }

    if (action === RequestAction.REJECT) {
      return this.rejectRegistration(token);
    }

    throw new BadRequestException('Invalid handle registration request');
  }

  async handleConnect(token: string, action: RequestAction) {
    if (action === RequestAction.ACCEPT) {
      return this.acceptConnect(token);
    }

    if (action === RequestAction.REJECT) {
      return this.rejectConnect(token);
    }

    throw new BadRequestException('Invalid handle request');
  }

  async handleDisconnect(userProfile: UserProfile, nodeId: string) {
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

  private async acceptRequest(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const request = parse<UserInvitation>(cache);
    if (!request) {
      throw new BadRequestException('Request not found');
    }

    if (request.status !== UserStatus.ROLE_REQUEST) {
      throw new BadRequestException('Invalid token');
    }

    const toUser = await this.userRepository.findOne({ email: request.email });
    if (!toUser) {
      throw new BadRequestException('User not found');
    }

    const tokensStr = await this.redisService.get(this.prefix, toUser.id);
    const tokens = parse<UserToken>(tokensStr) ?? [];

    delete tokens[UserStatus.ROLE_REQUEST];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, toUser.id);
    } else {
      await this.redisService.set(
        this.prefix,
        toUser.id,
        JSON.stringify(tokens),
      );
    }

    await this.handleRemoveToken(token);

    if (toUser.role === Role.SUPERADMIN) {
      throw new BadRequestException('Superadmin cannot be changed');
    }

    const notification = {
      read: false,
      type: NotificationType.REQUEST,
      message: `Admin <b>approved</b> your role changes to ${
        isVowel(toUser.role) ? 'an' : 'a'
      } <b>${toUser.role}</b>. Please sign in again to make changes.`,
      to: toUser._id,
      action: false,
    };

    toUser.role = request.role;

    await toUser.save();
    await this.redisService.del('auth', toUser.id);
    await this.notificationRepository.insert(notification);

    return {
      message: 'Request is accepted',
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

    if (request.status !== UserStatus.ROLE_REQUEST) {
      throw new BadRequestException('Invalid token');
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

    const tokensStr = await this.redisService.get(this.prefix, toUser.id);
    const tokens = parse<UserToken>(tokensStr) ?? {};

    delete tokens[UserStatus.ROLE_REQUEST];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, toUser.id);
    } else {
      await this.redisService.set(
        this.prefix,
        toUser.id,
        JSON.stringify(tokens),
      );
    }

    await this.handleRemoveToken(token);
    await this.notificationRepository.insert(notification);

    return {
      message: 'Request is rejected',
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

    const tokensStr = await this.redisService.get(this.prefix, user.id);
    const tokens = parse<UserToken>(tokensStr) ?? {};

    delete tokens[UserStatus.ROLE_UPDATE];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, user.id);
    } else {
      await this.redisService.set(this.prefix, user.id, JSON.stringify(tokens));
    }

    await this.handleRemoveToken(token);

    if (user.role === Role.SUPERADMIN) {
      throw new BadRequestException('Superadmin role cannot be changed');
    }

    user.role = invitation.role;

    await user.save();
    await this.redisService.del('auth', user.id);

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

    if (invitation.status !== UserStatus.ROLE_UPDATE) {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.userRepository.findOne({ email: invitation.email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const tokensStr = await this.redisService.get(this.prefix, user.id);
    const tokens = parse<UserToken>(tokensStr) ?? {};

    delete tokens[UserStatus.ROLE_UPDATE];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, user.id);
    } else {
      await this.redisService.set(this.prefix, user.id, JSON.stringify(tokens));
    }

    await this.handleRemoveToken(token);

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

  private async acceptConnect(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const request = parse<ConnectRequest>(cache);
    if (!request) {
      throw new BadRequestException('Request not found');
    }

    if (request.status !== UserStatus.CONNECT_REQUEST) {
      throw new BadRequestException('Invalid connect request');
    }

    const user = await this.userRepository.findById(request.userId);
    const node = await this.nodeRepository.findById(request.nodeId);

    node.userId = user._id;
    user.nodeId = node._id;

    await user.save();
    await node.save();

    const tokensStr = await this.redisService.get(this.prefix, user.id);
    const tokens = parse<UserToken>(tokensStr) ?? {};

    delete tokens[UserStatus.CONNECT_REQUEST];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, user.id);
    } else {
      await this.redisService.set(this.prefix, user.id, JSON.stringify(tokens));
    }

    await this.handleRemoveToken(token);
    await this.redisService.del('auth', user.id);

    const notification = {
      read: false,
      type: NotificationType.CONNECT,
      message: `Admin <b>approved</b> your connect request of <b>${startCase(
        node.fullname,
      )}</b> node profile. Please sign in again to make changes.`,
      to: user.id,
      action: false,
    };

    await this.notificationRepository.insert(notification);

    return {
      message: 'Connect request is accepted',
    };
  }

  private async rejectConnect(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const request = parse<ConnectRequest>(cache);
    if (!request) {
      throw new BadRequestException('Request not found');
    }

    if (request.status !== UserStatus.CONNECT_REQUEST) {
      throw new BadRequestException('Request not found');
    }

    const user = await this.userRepository.findById(request.userId);
    const node = await this.nodeRepository.findById(request.nodeId);

    const tokensStr = await this.redisService.get(this.prefix, user.id);
    const tokens = parse<UserToken>(tokensStr) ?? {};

    delete tokens[UserStatus.CONNECT_REQUEST];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, user.id);
    } else {
      await this.redisService.set(this.prefix, user.id, JSON.stringify(tokens));
    }

    await this.handleRemoveToken(token);

    const notification = {
      read: false,
      type: NotificationType.CONNECT,
      message: `Admin <b>rejected</b> your connect request of ${startCase(
        node.fullname,
      )}`,
      to: user.id,
      action: false,
    };

    await this.notificationRepository.insert(notification);

    return {
      message: 'Connect request is rejected',
    };
  }

  private async acceptRegistration(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const invitation = parse<UserInvitation>(cache);
    if (!invitation) {
      throw new BadRequestException('Invalid token');
    }

    if (invitation.status !== UserStatus.REGISTRATION) {
      throw new BadRequestException('Invalid token');
    }

    if (!invitation.verified.user) {
      invitation.verified = { admin: true, user: false };

      const str = JSON.stringify(invitation);

      await this.redisService.set(this.prefix, token, str, TTL);
      await this.redisService.set(this.prefix, invitation.email, token, TTL);
      await this.redisService.set(this.prefix, invitation.username, token, TTL);
      await this.notificationRepository.updateMany(
        { referenceId: token },
        { $unset: { referenceId: '' }, action: false, read: true },
      );

      return {
        message: 'New user is verified',
      };
    }

    const data = new CreateUserDto();

    data.email = invitation.email;
    data.role = invitation.role;
    if (invitation.name) data.name = invitation.name;
    if (invitation.username) data.username = invitation.username;
    if (invitation.password) data.password = invitation.password;

    const { email, username } = data;

    const exist = await this.userRepository.findOne({
      $or: [{ email: email }, { username: username }],
    });

    await this.handleRemoveToken(token);
    await this.redisService.del(this.prefix, data.email);
    await this.redisService.del(this.prefix, data.username);

    if (exist) {
      await this.mailService.sendEmailTo(email, {
        type: 'email-found',
        email: email,
      });

      throw new BadRequestException('Successfully failed register new user.');
    }

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

    await this.mailService.sendEmailTo(email, {
      type: 'registration-accepted',
    });

    return {
      message: 'User registration is accepted',
    };
  }

  private async rejectRegistration(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const invitation = parse<UserInvitation>(cache);
    if (invitation.status !== UserStatus.REGISTRATION) {
      throw new BadRequestException('Invalid token');
    }

    await this.handleRemoveToken(token);
    await this.redisService.del(this.prefix, invitation.email);
    await this.redisService.del(this.prefix, invitation.username);

    await this.mailService.sendEmailTo(invitation.email, {
      type: 'registration-rejected',
      email: invitation.email,
    });

    return {
      message: 'User registration is rejected',
    };
  }

  private async handleRemoveToken(token: string) {
    await this.redisService.del(this.prefix, token);
    await this.notificationRepository.updateMany(
      { referenceId: token },
      { $unset: { referenceId: '' }, action: false, read: true },
    );
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
