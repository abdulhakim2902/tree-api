import { BadRequestException, Injectable } from '@nestjs/common';
import { Express } from 'express';
import { UploadFileDto } from './dto/upload-file.dto';
import { File } from './file.schema';
import { CloudinaryService } from 'nestjs-cloudinary';
import { FileRepository } from './file.repository';

@Injectable()
export class FileService {
  constructor(
    private readonly fileRepository: FileRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findFiles(nodeId?: string) {
    const query = {};
    if (nodeId) Object.assign(query, { publicId: new RegExp(`^${nodeId}`) });
    return this.fileRepository.find(query);
  }

  async createFile(
    file: Express.Multer.File,
    data: UploadFileDto,
  ): Promise<File> {
    try {
      const {
        public_id: publicId,
        asset_id: assetId,
        secure_url: url,
      } = await this.cloudinaryService.uploadFile(file, {
        folder: data.nodeId,
        resource_type: 'image',
        transformation: { raw_transformation: 'w_500' },
      });

      return this.fileRepository.insert({ publicId, assetId, url });
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async deleteFile(id: string, type?: string) {
    if (type === 'node') {
      const files = await this.findFiles(id);
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
