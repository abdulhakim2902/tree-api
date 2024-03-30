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

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto): Promise<User> {
    const createUserDto = new CreateUserDto();
    const token = data.token;

    createUserDto.name = data.name;
    createUserDto.password = data.password;
    createUserDto.username = data.username;

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

    const token = await this.jwtService.signAsync(payload);
    return { token };
  }
}
