import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { Express } from 'express';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileService } from './file.service';

@ApiBearerAuth()
@ApiTags(Tag.FILE)
@Controller(Prefix.FILE)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: UploadFileDto,
  ) {
    return this.fileService.createFile(file, data);
  }

  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return this.fileService.deleteFile(id);
  }
}
