import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/user/schemas/user.schema';
import { UserService } from '../user/user.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { Node, NodeSchema } from '../node/schemas/node.schema';
import { UserRepository } from '../user/repositories/user.repository';
import { RoleGuard } from './guards/role.guard';
import { MailService } from '../mail/mail.service';
import {
  UserRequest,
  UserRequestSchema,
} from '../user/schemas/user-request.schema';
import { UserRequestRepository } from '../user/repositories/user-request.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Node.name, schema: NodeSchema },
      { name: UserRequest.name, schema: UserRequestSchema },
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
    UserRepository,
    UserRequestRepository,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
