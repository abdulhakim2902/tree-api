import { Controller, Get, Param, Patch, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { Request as Req } from 'src/interfaces/request.interface';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './dto/query-notification.dto';

@ApiBearerAuth()
@ApiTags(Tag.NOTIFICATION)
@Controller(Prefix.NOTIFICATION)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('/')
  async find(@Request() req: Req, @Query() query: QueryNotificationDto) {
    return this.notificationService.find(req.user.id, query);
  }

  @Get('/count')
  async count(@Request() req: Req, @Query() query: QueryNotificationDto) {
    return this.notificationService.count(req.user.id, query);
  }

  @Patch('/:id/read')
  async patch(@Request() req: Req, @Param('id') id: string) {
    return this.notificationService.patch(req.user.id, id);
  }
}
