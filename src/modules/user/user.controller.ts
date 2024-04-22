import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { Roles } from 'src/decorators/role';
import { Role } from 'src/enums/role.enum';
import { RoleInviteDto, RoleRequestDto } from './dto/invite-request-user.dto';
import { Public } from 'src/decorators/public';
import { RequestAction } from 'src/enums/request-action';
import { UserProfile } from 'src/decorators/user-profile';

@ApiBearerAuth()
@ApiTags(Tag.USER)
@Controller(Prefix.USER)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Get('/tokens/:id')
  async getTokens(@Param('id') token: string) {
    return this.userService.getTokens(token);
  }

  // Me endpoint
  @Get('/me')
  async me(@UserProfile('id') id: string) {
    return this.userService.me(id);
  }

  @ApiBody({ type: UpdateUserDto, isArray: false })
  @Patch('/me')
  async updateById(@UserProfile('id') id: string, @Body() data: UpdateUserDto) {
    return this.userService.update(id, data);
  }

  @Post('/update-email/:token')
  async updateEmail(
    @UserProfile('id') id: string,
    @Param('token') token: string,
  ) {
    return this.userService.handleEmailUpdate(id, token);
  }

  // User Registration endpoint
  @Roles([Role.SUPERADMIN])
  @Post('/user-registrations/:token/:action')
  async handleUserRegistration(
    @Param('token') token: string,
    @Param('action') action: RequestAction,
  ) {
    return this.userService.handleUserRegistration(token, action);
  }

  // Role Request endpoint
  @ApiBody({ type: RoleRequestDto, isArray: false })
  @Roles([Role.GUEST, Role.EDITOR, Role.CONTRIBUTOR])
  @Post('/role-requests')
  async createRequest(
    @UserProfile('id') id: string,
    @Body() data: RoleRequestDto,
  ) {
    return this.userService.createRoleRequest(id, data);
  }

  @Roles([Role.SUPERADMIN])
  @Post('/role-requests/:token/:action')
  async handleRoleRequest(
    @Param('token') token: string,
    @Param('action') action: RequestAction,
  ) {
    return this.userService.handleRoleRequest(token, action);
  }

  // Role Invite endpoint
  @ApiBody({ type: RoleInviteDto, isArray: true })
  @Roles([Role.SUPERADMIN])
  @Post('/role-invitations')
  async createRoleInvitation(@Body() data: RoleInviteDto[]) {
    return this.userService.createRoleInvitation(data);
  }

  @Post('/role-invitations/:token/:action')
  async handleRoleInvitation(
    @Param('token') token: string,
    @Param('action') action: RequestAction,
  ) {
    return this.userService.handleRoleInvitation(token, action);
  }
}
