import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user/user.schema';
import { Node, NodeSchema } from './node/schemas/node.schema';
import {
  Notification,
  NotificationSchema,
} from './notification/notification.schema';
import { File, FileSchema } from './file/file.schema';
import { AuthController } from './auth/auth.controller';
import { FileController } from './file/file.controller';
import { NodeController } from './node/node.controller';
import { NotificationController } from './notification/notification.controller';
import { UserController } from './user/user.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoleGuard } from './auth/guards/role.guard';
import { AuthGuard } from './auth/guards/auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { MailService } from './mail/mail.service';
import { RedisService } from './redis/redis.service';
import { UserRepository } from './user/user.repository';
import { NodeRepository } from './node/node.repository';
import { NotificationRepository } from './notification/notification.repository';
import { RedisFactory } from './redis/redis.provider';
import { SocketGateway } from './socket/socket.gateway';
import { FileService } from './file/file.service';
import { FileRepository } from './file/file.repository';
import { NodeService } from './node/node.service';
import { NotificationService } from './notification/notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
      { name: Node.name, schema: NodeSchema },
      { name: User.name, schema: UserSchema },
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
  controllers: [
    AuthController,
    FileController,
    NodeController,
    UserController,
    NotificationController,
  ],
  providers: [
    AuthService,
    UserService,
    MailService,
    RedisService,
    FileService,
    NodeService,
    NotificationService,

    FileRepository,
    UserRepository,
    NodeRepository,
    NotificationRepository,

    RedisFactory,
    SocketGateway,

    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
})
export class Modules {}
