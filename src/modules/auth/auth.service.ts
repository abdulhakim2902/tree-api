import * as bcrypt from 'bcrypt';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import { AccessToken } from 'src/interfaces/access-token.interface';
import { UserProfile } from 'src/interfaces/user-profile.interface';
import { UserService } from '../user/user.service';
import { User } from 'src/modules/user/user.schema';
import { CreateUserDto } from '../user/dto';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { generateRandomString } from 'src/helper/string';
import { UserInvitation } from 'src/interfaces/user-invitations';
import { uniq } from 'lodash';

@Injectable()
export class AuthService {
  private readonly prefix = 'auth';
  private readonly expires = 24 * 60 * 60;
  private readonly configService: ConfigService;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {
    this.configService = new ConfigService();
  }

  async register(data: RegisterDto): Promise<User> {
    const createUserDto = new CreateUserDto();
    const token = data.token;

    createUserDto.name = data.name;
    createUserDto.password = data.password;
    createUserDto.username = data.username;
    createUserDto.email = data.email;

    return this.userService.insert(createUserDto, token);
  }

  async login(data: LoginDto): Promise<AccessToken> {
    const { username, password } = data;
    const user = await this.userService.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user) {
      const prefix = 'user';
      const token = await this.redisService.get<string>(prefix, username);
      if (!token) {
        throw new NotFoundException('User not found');
      }

      const user = await this.redisService.get<UserInvitation>(prefix, token);
      if (!user) {
        throw new BadRequestException('Expired token');
      }

      if (!user?.verified?.user) {
        throw new UnprocessableEntityException(
          'Your account is not verified. Please check your email for the verification.',
        );
      }

      if (!user?.verified?.admin) {
        throw new UnprocessableEntityException(
          'Your account is not verified by the admin. Please contact your admin.',
        );
      }
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const payload: UserProfile = {
      id: user.id,
      role: user.role,
      email: user.email,
      username: user.username,
    };

    const envSecret = this.configService.get<string>('JWT_SECRET');
    const randSecret = generateRandomString();
    const secret = envSecret + randSecret;
    const sessionToken = await this.jwtService.signAsync(payload, { secret });
    const cacheData = { id: user.id, secret: randSecret, token: sessionToken };

    const key = 'active_users';
    const actives = await this.redisService
      .get<string[]>(this.prefix, key)
      .then((res) => res ?? []);

    await this.redisService.set(this.prefix, key, uniq([...actives, user.id]));
    await this.redisService.set(this.prefix, user.id, cacheData, this.expires);

    return { token: sessionToken, verified: true };
  }

  async logout(id: string) {
    const key = 'active_users';
    const actives = await this.redisService
      .get<string[]>(this.prefix, key)
      .then((res) => (res ?? []).filter((e) => e !== id));

    await this.redisService.set(this.prefix, key, actives);
    await this.redisService.del(this.prefix, id);

    return {
      message: 'Successfully sign out',
    };
  }
}
