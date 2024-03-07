import { Body, Controller, Get, Patch, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { UpdateUserDto } from './dto';
import { Request as Req } from 'src/interfaces/request.interface';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';

@ApiBearerAuth()
@ApiTags(Tag.USER)
@Controller(Prefix.USER)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  async me(@Request() req: Req) {
    return this.userService.me(req?.user?.id);
  }

  @ApiBody({ type: UpdateUserDto, isArray: false })
  @Patch('/me')
  async updateById(@Request() req: Req, @Body() data: UpdateUserDto) {
    return this.userService.update(req?.user?.id, data);
  }
}
