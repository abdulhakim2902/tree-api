import { Body, Controller, Get, Param, Patch, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { Request as Req } from 'src/interfaces/request.interface';
import { NotificationService } from './notification.service';
import { UpdateNotificationDto } from './dto/update-notification';

@ApiBearerAuth()
@ApiTags(Tag.NOTIFICATION)
@Controller(Prefix.NOTIFICATION)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('/')
  async find(@Request() req: Req) {
    return this.notificationService.find(req.user.id);
  }

  @ApiBody({ type: UpdateNotificationDto, isArray: false })
  @Patch('/:id')
  async patch(
    @Request() req: Req,
    @Param('id') id: string,
    @Body() data: UpdateNotificationDto,
  ) {
    return this.notificationService.patch(req.user.id, id, data);
  }
}
