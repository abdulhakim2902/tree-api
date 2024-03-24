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
import { NodeService } from '../node/node.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly nodeService: NodeService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto): Promise<User> {
    const node = await this.nodeService.createNode(data.profile);
    const user = await this.userService.insert(data);
    user.node = node;
    return user.save();
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

    if (user.node) {
      const nodeId = user.node.toString();
      try {
        await this.nodeService.findById(nodeId);
      } catch {
        await this.userService.updateById(user.id, { $unset: { node: '' } });
        delete user.node;
      }
    }

    const payload: UserProfile = {
      id: user.id,
      username: user.username,
      email: user.email,
      nodeId: user?.node?.toString(),
    };

    if (user.node) {
      payload.nodeId = user.node.toString();
    }

    const token = await this.jwtService.signAsync(payload);
    return { token };
  }
}
