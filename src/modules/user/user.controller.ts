import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { Roles } from 'src/decorators/role';
import { Role } from 'src/enums/role.enum';
import {
  InviteRequestUserDto,
  InviteRequestUserRoleDto,
} from './dto/invite-request-user.dto';
import { Public } from 'src/decorators/public';
import { RequestAction } from 'src/enums/request-action';
import { UserProfile } from 'src/decorators/user-profile';
import { ConnectNodeDto } from './dto/connect-node.dto';
import { UserProfile as User } from 'src/interfaces/user-profile.interface';

@ApiBearerAuth()
@ApiTags(Tag.USER)
@Controller(Prefix.USER)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  async me(@UserProfile('id') id: string) {
    return this.userService.me(id);
  }

  @ApiBody({ type: InviteRequestUserDto, isArray: true })
  @Roles([Role.SUPERADMIN])
  @Post('/invites')
  async createInvitation(@Body() data: InviteRequestUserDto[]) {
    return this.userService.createInvitation(data);
  }

  @ApiBody({ type: InviteRequestUserRoleDto, isArray: false })
  @Roles([Role.GUEST, Role.EDITOR, Role.CONTRIBUTOR])
  @Post('/requests')
  async createRequest(
    @UserProfile('id') id: string,
    @Body() data: InviteRequestUserRoleDto,
  ) {
    return this.userService.createRequest(id, data);
  }

  @Post('/connect-node')
  async connectNode(
    @UserProfile('id') id: string,
    @Body() data: ConnectNodeDto,
  ) {
    return this.userService.connectNode(id, data);
  }

  @Roles([Role.SUPERADMIN])
  @Post('/requests/:token/:action')
  async handleRequest(
    @Param('token') token: string,
    @Param('action') action: RequestAction,
  ) {
    return this.userService.handleRequest(token, action);
  }

  @Roles([Role.SUPERADMIN])
  @Post('/connect-node/:token/:action')
  async handleConnect(
    @Param('token') token: string,
    @Param('action') action: RequestAction,
  ) {
    return this.userService.handleConnect(token, action);
  }

  @Post('/disconnect-node/:nodeId')
  async handleDisconnect(
    @UserProfile() user: User,
    @Param('nodeId') nodeId: string,
  ) {
    return this.userService.handleDisconnect(user, nodeId);
  }

  @Roles([Role.SUPERADMIN])
  @Post('/:id/revoke')
  async revoke(@Param('id') id: string) {
    return this.userService.revoke(id);
  }

  @ApiBody({ type: UpdateUserDto, isArray: false })
  @Patch('/me')
  async updateById(@UserProfile('id') id: string, @Body() data: UpdateUserDto) {
    return this.userService.update(id, data);
  }

  @Public()
  @Get('/invitation/:token')
  async invitation(@Param('token') token: string) {
    return this.userService.invitation(token);
  }

  @Public()
  @Post('/invitation/:token/:action')
  async acceptInvitation(
    @Param('token') token: string,
    @Param('action') action: RequestAction,
  ) {
    return this.userService.handleInvitation(token, action);
  }
}
