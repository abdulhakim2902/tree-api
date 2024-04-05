import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UserProfile } from 'src/decorators/user-profile';

@ApiBearerAuth()
@ApiTags(Tag.NOTIFICATION)
@Controller(Prefix.NOTIFICATION)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('/')
  async find(
    @UserProfile('id') userId: string,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.find(userId, query);
  }

  @Get('/count')
  async count(
    @UserProfile('id') userId: string,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.count(userId, query);
  }

  @Patch('/:id/read')
  async read(@Param('id') id: string, @UserProfile('id') userId: string) {
    return this.notificationService.read(userId, id);
  }

  @Patch('/read/all')
  async readAll(@UserProfile('id') userId: string) {
    return this.notificationService.read(userId);
  }
}
