import * as bcrypt from 'bcrypt';

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
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
    const user = await this.userService.findOne({
      $or: [{ username: data.username }, { email: data.username }],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(data.password, user.password);
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

    await this.redisService.set(
      this.prefix,
      user.id,
      JSON.stringify(cacheData),
      this.expires,
    );

    return { token: sessionToken };
  }
}
