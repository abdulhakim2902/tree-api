import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common/pipes';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const config = new ConfigService();
  const port = config.get<number>('PORT');
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tree')
    .setDescription('The famliy tree API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('explorer', app, document);

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(port, async () => {
    console.log('Listening on', await app.getUrl());
  });
}
bootstrap();
