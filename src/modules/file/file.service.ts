import { BadRequestException, Injectable } from '@nestjs/common';
import { Express } from 'express';
import { UploadFileDto } from './dto/upload-file.dto';
import { File } from './file.schema';
import { CloudinaryService } from 'nestjs-cloudinary';
import { FileRepository } from './file.repository';
import { QueryFileDto } from './dto/query-file.dto';
import { FilterQuery } from 'mongoose';
import { FileType } from 'src/enums/file-type.enum';

@Injectable()
export class FileService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findFiles(query: QueryFileDto) {
    const filter = {} as FilterQuery<File>;
    if (query.id) {
      filter.publicId = new RegExp(`^${query.id}`);
    }

    if (query.type) {
      filter.type = query.type;
    }

    return this.fileRepository.find(filter);
  }

  async createFile(
    file: Express.Multer.File,
    data: UploadFileDto,
  ): Promise<File> {
    try {
      const { id, type } = data;
      const {
        public_id: publicId,
        asset_id: assetId,
        secure_url: url,
      } = await this.cloudinaryService.uploadFile(file, {
        folder: id,
        resource_type: 'image',
        transformation: { raw_transformation: 'w_500' },
      });

      return this.fileRepository.insert({ publicId, assetId, url, type });
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async deleteFile(id: string, type?: string) {
    if (type === 'node') {
      const files = await this.findFiles({ id, type: FileType.NODE });
      const publicIds = files.map((file) => file.publicId);
      await this.fileRepository.deleteMany({ publicId: { $in: publicIds } });
      await this.cloudinaryService.cloudinary.api
        .delete_folder(id)
        .catch(console.log);
      await this.cloudinaryService.cloudinary.api.delete_all_resources({
        public_ids: publicIds,
      });
      return {
        id,
        message: 'Successfully delete file',
      };
    }

    const file = await this.fileRepository.findById(id);
    await this.cloudinaryService.cloudinary.api.delete_resources([
      file.publicId,
    ]);
    await this.fileRepository.deleteById(id);

    return {
      id,
      message: 'Successfully delete file',
    };
  }
}
