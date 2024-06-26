import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import {
  BadRequestException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from 'src/modules/user/user.schema';
import { UserRepository } from 'src/modules/user/user.repository';
import { Role } from 'src/enums/role.enum';
import { RoleInviteDto, RoleRequestDto } from './dto/invite-request-user.dto';
import { UserStatus } from 'src/enums/user-status.enum';
import { MailService } from '../mail/mail.service';
import {
  UpdateUser,
  UserInvitation,
  UserToken,
} from 'src/interfaces/user-invitations';
import { RequestAction } from 'src/enums/request-action';
import { NotificationType } from 'src/enums/notification-type.enum';
import { startCase } from 'lodash';
import { NotificationRepository } from '../notification/notification.repository';
import { RedisService } from '../redis/redis.service';
import { isVowel } from 'src/helper/string';
import { SocketGateway } from '../socket/socket.gateway';
import { UpdateQuery } from 'mongoose';

const TTL = 60 * 60; // 1HOUR

@Injectable()
export class UserService {
  private readonly prefix = 'user';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
    private readonly socket: SocketGateway,
  ) {}

  async me(id: string) {
    const user = await this.userRepository.findById(id);
    const userWithProfileImage = await user.populate('profileImage');
    const result = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    if (userWithProfileImage?.profileImage?.url) {
      const { _id, url } = userWithProfileImage.profileImage;
      Object.assign(result, {
        profileImageURL: `${_id};${url}`,
      });
    }

    return result;
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

      await this.redisService.set(this.prefix, token, payload, TTL);
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
      throw new BadRequestException('Invalid data');
    }

    const invitation = cache as UserInvitation;
    const status = invitation.status;
    if (![UserStatus.NEW_USER, UserStatus.REGISTRATION].includes(status)) {
      throw new BadRequestException('Invalid token');
    }

    // Double verification by user and admin, if the registration
    // not through invitation by the admin
    if (invitation.status === UserStatus.REGISTRATION) {
      if (!invitation?.verified?.admin) {
        invitation.verified.user = true;

        await this.redisService.set(this.prefix, token, invitation);
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
    if (data.email) {
      const user = await this.userRepository.findById(id);
      const cache = await this.redisService.get(this.prefix, id);
      const tokens = (cache as UserToken) ?? {};
      const currentToken = tokens?.[UserStatus.EMAIL_UPDATE];
      const token = currentToken ?? (await this.generateOTP());
      const payload = {
        currentEmail: user.email,
        updatedEmail: data.email,
        status: UserStatus.EMAIL_UPDATE,

        type: 'email-update',
        token: token,
      };

      tokens[UserStatus.EMAIL_UPDATE] = token;

      await this.redisService.set(this.prefix, token, payload, TTL);
      await this.redisService.set(this.prefix, id, tokens);
      await this.mailService.sendEmailTo(data.email, payload);

      return user;
    }

    const update = {} as UpdateQuery<User>;

    if (data.password) {
      const { current, new: newPasword } = data.password;
      const user = await this.userRepository.findById(id);
      const isValid = await bcrypt.compare(current, user.password);
      if (!isValid) {
        throw new BadRequestException('Invalid password');
      }

      const salt = bcrypt.genSaltSync(10);

      update.password = bcrypt.hashSync(newPasword, salt);
    }

    if (data.name) update.name = data.name;
    if (data.profileImage) update.profileImage = data.profileImage;

    return this.userRepository.updateById(id, update);
  }

  async findOne(filter: Record<string, any>): Promise<User> {
    return this.userRepository.findOne(filter);
  }

  async updateById(id: string, update: Record<string, any>) {
    await this.userRepository.updateOne({ _id: id }, update);
  }

  async getTokens(id: string) {
    const data = await this.redisService.get(this.prefix, id);
    if (!data) {
      throw new BadRequestException('Token not found');
    }

    return data;
  }

  async createRoleInvitation(data: RoleInviteDto[]) {
    for (const e of data) {
      const { email, role } = e;
      const toUser = await this.userRepository.findOne({ email });

      let token = await this.generateOTP();
      let status = UserStatus.NEW_USER;
      if (toUser) {
        status = UserStatus.ROLE_UPDATE;
      }

      const data = { email, role, status };

      if (status === UserStatus.NEW_USER) {
        const current = await this.redisService.get<string>(this.prefix, email);
        if (current) {
          await this.redisService.del(this.prefix, current);
        }

        const to = email;
        const emailPayload = { token, type: 'invites', role };

        await this.mailService.sendEmailTo(to, emailPayload);
        await this.redisService.set(this.prefix, token, data, TTL);
        await this.redisService.set(this.prefix, email, token, TTL);
      } else {
        const cache = await this.redisService.get(this.prefix, toUser.id);
        const tokens = (cache as UserToken) ?? {};
        const current = tokens[UserStatus.ROLE_UPDATE];
        if (current) token = current;

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

        await this.redisService.set(this.prefix, token, data);
        await this.redisService.set(this.prefix, toUser.id, tokens);
        await this.notificationRepository.findAndModify(
          {
            referenceId: token,
            read: false,
            type: NotificationType.INVITATION,
          },
          notification,
        );

        await this.sendNotification(toUser.id);
      }
    }

    return {
      message: 'Invitation is sent',
    };
  }

  async createRoleRequest(id: string, data: RoleRequestDto) {
    const toUser = await this.userRepository.findOne({ role: Role.SUPERADMIN });
    if (!toUser) {
      throw new BadRequestException('Admin not found');
    }

    const cache = await this.redisService.get(this.prefix, id);
    const tokens = (cache as UserToken) ?? {};
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

    await this.redisService.set(this.prefix, token, payload);
    await this.redisService.set(this.prefix, id, tokens);
    await this.notificationRepository.findAndModify(
      { referenceId: token, read: false, type: NotificationType.REQUEST },
      notification,
    );

    await this.sendNotification(toUser.id);

    return {
      message: 'Request is sent',
    };
  }

  async handleEmailUpdate(id: string, token: string) {
    const cache = await this.redisService.get(this.prefix, id);
    const tokens = (cache as UserToken) ?? {};
    const currentToken = tokens?.[UserStatus.EMAIL_UPDATE];

    if (token !== currentToken) {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.redisService.get<UpdateUser>(this.prefix, token);
    if (!user) {
      throw new BadRequestException('Expired token');
    }

    if (user.status !== UserStatus.EMAIL_UPDATE) {
      throw new BadRequestException('Invalid token');
    }

    delete tokens[UserStatus.EMAIL_UPDATE];

    await this.userRepository.updateById(id, {
      $set: { email: user.updatedEmail },
    });

    await this.redisService.del(this.prefix, currentToken);
    await this.redisService.set(this.prefix, id, tokens);

    return { message: 'Successfully update email' };
  }

  async handleRoleInvitation(token: string, action: RequestAction) {
    if (action === RequestAction.ACCEPT) {
      return this.acceptRoleInvitation(token);
    }

    if (action === RequestAction.REJECT) {
      return this.rejectRoleInvitation(token);
    }

    throw new BadRequestException('Invalid handle request');
  }

  async handleRoleRequest(token: string, action: RequestAction) {
    if (action === RequestAction.ACCEPT) {
      return this.acceptRoleRequest(token);
    }

    if (action === RequestAction.REJECT) {
      return this.rejectRoleRequest(token);
    }

    throw new BadRequestException('Invalid handle request');
  }

  async handleUserRegistration(token: string, action: RequestAction) {
    if (action === RequestAction.ACCEPT) {
      return this.acceptUserRegistration(token);
    }

    if (action === RequestAction.REJECT) {
      return this.rejectUserRegistration(token);
    }

    throw new BadRequestException('Invalid handle registration request');
  }

  private async acceptRoleRequest(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const request = cache as UserInvitation;
    if (request.status !== UserStatus.ROLE_REQUEST) {
      throw new BadRequestException('Invalid token');
    }

    const toUser = await this.userRepository.findOne({ email: request.email });
    if (!toUser) {
      throw new BadRequestException('User not found');
    }

    const tokensCache = await this.redisService.get(this.prefix, toUser.id);
    const tokens = (tokensCache as UserToken) ?? {};

    delete tokens[UserStatus.ROLE_REQUEST];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, toUser.id);
    } else {
      await this.redisService.set(this.prefix, toUser.id, tokens);
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
    await this.sendNotification(toUser.id, 'logout');

    return {
      message: 'Request is accepted',
    };
  }

  private async rejectRoleRequest(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const request = cache as UserInvitation;
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

    const tokensCache = await this.redisService.get(this.prefix, toUser.id);
    const tokens = (tokensCache as UserToken) ?? {};

    delete tokens[UserStatus.ROLE_REQUEST];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, toUser.id);
    } else {
      await this.redisService.set(this.prefix, toUser.id, tokens);
    }

    await this.handleRemoveToken(token);
    await this.notificationRepository.insert(notification);
    await this.sendNotification(toUser.id);

    return {
      message: 'Request is rejected',
    };
  }

  private async acceptRoleInvitation(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const invitation = cache as UserInvitation;
    if (invitation.status !== UserStatus.ROLE_UPDATE) {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.userRepository.findOne({ email: invitation.email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const tokensCache = await this.redisService.get(this.prefix, user.id);
    const tokens = (tokensCache as UserToken) ?? {};

    delete tokens[UserStatus.ROLE_UPDATE];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, user.id);
    } else {
      await this.redisService.set(this.prefix, user.id, tokens);
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

  private async rejectRoleInvitation(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const invitation = cache as UserInvitation;
    if (invitation.status !== UserStatus.ROLE_UPDATE) {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.userRepository.findOne({ email: invitation.email });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const tokenCache = await this.redisService.get(this.prefix, user.id);
    const tokens = (tokenCache as UserToken) ?? {};

    delete tokens[UserStatus.ROLE_UPDATE];

    if (Object.values(tokens).length <= 0) {
      await this.redisService.del(this.prefix, user.id);
    } else {
      await this.redisService.set(this.prefix, user.id, tokens);
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

  private async acceptUserRegistration(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const invitation = cache as UserInvitation;

    if (invitation.status !== UserStatus.REGISTRATION) {
      throw new BadRequestException('Invalid token');
    }

    if (!invitation.verified.user) {
      invitation.verified = { admin: true, user: false };

      await this.redisService.set(this.prefix, token, invitation, TTL);
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

  private async rejectUserRegistration(token: string) {
    const cache = await this.redisService.get(this.prefix, token);
    if (!cache) {
      throw new BadRequestException('Expired token');
    }

    const invitation = cache as UserInvitation;
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

  private async sendNotification(to: string, action?: string) {
    try {
      const { count } = await this.notificationRepository.count({
        to,
        read: false,
      });
      await this.socket.sendNotification(to, count, action);
    } catch {
      // ignore
    }
  }
}
