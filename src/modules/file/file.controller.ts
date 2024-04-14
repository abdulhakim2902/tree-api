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
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Tag } from 'src/enums/api-tag.enum';
import { Prefix } from 'src/enums/controller-prefix.enum';
import { Express } from 'express';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileService } from './file.service';
import { Roles } from 'src/decorators/role';
import { Role } from 'src/enums/role.enum';
import { CREATE, DELETE, READ } from 'src/constants/permission';
import { QueryFileDto } from './dto/query-file.dto';
import { FileType } from 'src/enums/file-type.enum';

@ApiBearerAuth()
@ApiTags(Tag.FILE)
@Controller(Prefix.FILE)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('/')
  @Roles(READ)
  async find(@Query() query: QueryFileDto) {
    return this.fileService.findFiles(query);
  }

  @Post('/')
  @Roles([Role.CONTRIBUTOR, ...CREATE])
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: UploadFileDto,
  ) {
    return this.fileService.createFile(file, data);
  }

  @Delete('/:id/:type')
  @Roles(DELETE)
  async deleteById(@Param('id') id: string, @Param('type') type: FileType) {
    return this.fileService.deleteFile(id, type);
  }
}
