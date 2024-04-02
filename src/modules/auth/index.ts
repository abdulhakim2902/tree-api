import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/user/user.schema';
import { UserService } from '../user/user.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { Node, NodeSchema } from '../node/schemas/node.schema';
import { UserRepository } from '../user/user.repository';
import { RoleGuard } from './guards/role.guard';
import { MailService } from '../mail/mail.service';
import {
  Notification,
  NotificationSchema,
} from '../notification/notification.schema';
import { NotificationRepository } from '../notification/notification.repository';
import { RedisService } from '../redis/redis.service';
import { RedisFactory } from '../redis/redis.provider';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Node.name, schema: NodeSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UserService,
    MailService,
    RedisService,
    UserRepository,
    NotificationRepository,
    RedisFactory,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
})
export class AuthModule {}
