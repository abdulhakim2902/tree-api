import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto';
import { Request as Req } from 'src/interfaces/request.interface';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { Roles } from 'src/decorators/role';
import { Role } from 'src/enums/role.enum';
import { InviteRequestUserDto } from './dto/invite-request-user.dto';
import { Public } from 'src/decorators/public';

@ApiBearerAuth()
@ApiTags(Tag.USER)
@Controller(Prefix.USER)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  async me(@Request() req: Req) {
    return this.userService.me(req?.user?.id);
  }

  @ApiBody({ type: InviteRequestUserDto, isArray: true })
  @Roles([Role.SUPERADMIN])
  @Post('/invites')
  async invites(@Body() data: InviteRequestUserDto[]) {
    return this.userService.invites(data);
  }

  @ApiBody({ type: InviteRequestUserDto, isArray: false })
  @Roles([Role.GUEST, Role.EDITOR, Role.CONTRIBUTOR])
  @Post('/request')
  async request(@Body() data: InviteRequestUserDto) {
    return this.userService.request(data);
  }

  @Roles([Role.SUPERADMIN])
  @Post('/:id/revoke')
  async revoke(@Param('id') id: string) {
    return this.userService.revoke(id);
  }

  @ApiBody({ type: UpdateUserDto, isArray: false })
  @Patch('/me')
  async updateById(@Request() req: Req, @Body() data: UpdateUserDto) {
    return this.userService.update(req?.user?.id, data);
  }

  @Public()
  @Get('/invitation/:token')
  async getInvitation(@Param('token') token: string) {
    return this.userService.getInvitation(token);
  }

  @Public()
  @Post('/invitation/:token')
  async acceptInvitation(@Param('token') token: string) {
    return this.userService.acceptInvitation(token);
  }
}
