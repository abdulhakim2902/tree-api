import { InjectModel } from '@nestjs/mongoose';
import { File } from './file.schema';
import { Model } from 'mongoose';
import { CreateFileDto } from './dto/create-file.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

export class FileRepository {
  constructor(@InjectModel(File.name) readonly file: Model<File>) {}

  async insert(data: CreateFileDto): Promise<File> {
    try {
      const file = await this.file.create(data);
      return file;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async findById(id: string): Promise<File> {
    let file: File;

    try {
      file = await this.file.findById(id).exec();
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async deleteById(id: string) {
    let count = 0;

    try {
      const res = await this.file.deleteOne({ _id: id }).exec();
      count = res.deletedCount;
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    if (count <= 0) {
      throw new NotFoundException('File not found');
    }
  }
}
