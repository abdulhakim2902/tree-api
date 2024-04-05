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
import { Roles } from 'src/decorators/role';
import { Role } from 'src/enums/role.enum';
import { CREATE, DELETE, READ } from 'src/constants/permission';

@ApiBearerAuth()
@ApiTags(Tag.FILE)
@Controller(Prefix.FILE)
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('/')
  @Roles(READ)
  @ApiQuery({ type: String, name: 'nodeId', required: false })
  async find(@Query('nodeId') nodeId?: string) {
    return this.fileService.findFiles(nodeId);
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

  @Delete('/:id')
  @Roles(DELETE)
  @ApiQuery({ type: String, name: 'type', required: false })
  async deleteById(@Param('id') id: string, @Query('type') type?: string) {
    return this.fileService.deleteFile(id, type);
  }
}
