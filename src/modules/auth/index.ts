import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/user/user.schema';
import { UserService } from '../user/user.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { NodeService } from '../node/node.service';
import { Node, NodeSchema } from '../node/schemas/node.schema';
import { NodeRepository } from 'src/modules/node/node.repository';
import { UserRepository } from '../user/user.repository';
import { File, FileSchema } from '../file/file.schema';
import { FileRepository } from '../file/file.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
      { name: User.name, schema: UserSchema },
      { name: Node.name, schema: NodeSchema },
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
    NodeService,
    NodeRepository,
    UserRepository,
    FileRepository,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
