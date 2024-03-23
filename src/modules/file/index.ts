import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { File, FileSchema } from './file.schema';
import { FileService } from './file.service';
import { FileRepository } from './file.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
  ],
  controllers: [FileController],
  providers: [FileService, FileRepository],
})
export class FileModule {}
