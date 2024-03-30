import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { Tag } from 'src/enums/api-tag.enum';
import { Public } from 'src/decorators/public';
import { AccessToken } from 'src/interfaces/access-token.interface';
import { User } from 'src/modules/user/user.schema';
import { Roles } from 'src/decorators/role';
import { Role } from 'src/enums/role.enum';

@ApiTags(Tag.AUTH)
@Controller(Prefix.AUTH)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBody({ type: RegisterDto, isArray: false })
  @Roles([Role.SUPERADMIN])
  @Post('/register')
  async register(@Body() data: RegisterDto): Promise<User> {
    return this.authService.register(data);
  }

  @Public()
  @ApiBody({ type: LoginDto, isArray: false })
  @Post('/login')
  async login(@Body() data: LoginDto): Promise<AccessToken> {
    return this.authService.login(data);
  }
}
