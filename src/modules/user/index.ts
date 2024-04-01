import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/user/schemas/user.schema';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';
import { MailService } from '../mail/mail.service';
import { UserRequest, UserRequestSchema } from './schemas/user-request.schema';
import { UserRequestRepository } from './repositories/user-request.repository';
import {
  Notification,
  NotificationSchema,
} from '../notification/notification.schema';
import { NotificationRepository } from '../notification/notification.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserRequest.name, schema: UserRequestSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserRequestRepository,
    NotificationRepository,
    MailService,
  ],
})
export class UserModule {}
