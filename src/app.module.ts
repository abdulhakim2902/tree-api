import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth';
import { UserModule } from './modules/user';
import { NodeModule } from './modules/node';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CloudinaryModule } from 'nestjs-cloudinary';
import { FileModule } from './modules/file';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGO_URI'),
        dbName: configService.get('MONGO_DATABASE'),
      }),
    }),
    CloudinaryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        isGlobal: true,
        cloud_name: configService.get('CLOUDINARY_CLOUDNAME'),
        api_key: configService.get('CLOUDINARY_API_KEY'),
        api_secret: configService.get('CLOUDINARY_API_SECRET'),
      }),
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('SMTP_HOST'),
          auth: {
            user: configService.get('SMTP_USER'),
            pass: configService.get('SMTP_PASS'),
          },
        },
        defaults: {
          from: `No Reply <${configService.get('SMTP_HOST')}>`,
        },
      }),
    }),
    AuthModule,
    UserModule,
    NodeModule,
    FileModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
