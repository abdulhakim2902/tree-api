import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { Tag } from 'src/enums/api-tag.enum';
import { Public } from 'src/decorators/public';
import { AccessToken } from 'src/interfaces/access-token.interface';
import { User } from 'src/modules/user/user.schema';
import { UserProfile } from 'src/decorators/user-profile';

@ApiTags(Tag.AUTH)
@Controller(Prefix.AUTH)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiBody({ type: RegisterDto, isArray: false })
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

  @Post('/logout')
  async logout(@UserProfile('id') id: string) {
    return this.authService.logout(id);
  }
}
