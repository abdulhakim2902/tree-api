import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
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

  @Get('/')
  @ApiQuery({ type: String, name: 'nodeId', required: false })
  async find(@Query('nodeId') nodeId?: string) {
    return this.fileService.findFiles(nodeId);
  }

  @Post('/')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: UploadFileDto,
  ) {
    return this.fileService.createFile(file, data);
  }

  @Delete('/:id')
  @ApiQuery({ type: String, name: 'type', required: false })
  async deleteById(@Param('id') id: string, @Query('type') type?: string) {
    return this.fileService.deleteFile(id, type);
  }
}
