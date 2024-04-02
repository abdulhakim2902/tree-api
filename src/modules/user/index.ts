import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/user/user.schema';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { MailService } from '../mail/mail.service';
import {
  Notification,
  NotificationSchema,
} from '../notification/notification.schema';
import { NotificationRepository } from '../notification/notification.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository, NotificationRepository, MailService],
})
export class UserModule {}
