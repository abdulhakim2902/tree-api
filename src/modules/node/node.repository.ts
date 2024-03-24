import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { CreateNodeDto } from 'src/modules/node/dto';
import { Node } from 'src/modules/node/schemas/node.schema';

export class NodeRepository {
  constructor(
    @InjectModel(Node.name)
    readonly node: Model<Node>,
  ) {}

  async insert(data: CreateNodeDto): Promise<Node> {
    try {
      const node = await this.node.create(data);
      return node;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async aggregate<T>(pipeline?: PipelineStage[]): Promise<T[]> {
    try {
      const result = await this.node.aggregate<T>(pipeline).exec();
      return result;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async findById(id: string): Promise<Node> {
    let node: Node;

    try {
      node = await this.node.findById(id).populate('profileImage').exec();
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return node;
  }

  async findOne(filter: Record<string, any>): Promise<Node | null> {
    try {
      const node = await this.node.findOne(filter).exec();
      return node;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async find(filter?: Record<string, any>): Promise<Node[]> {
    try {
      const nodes = await this.node.find(filter ?? {}).exec();
      return nodes;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async updateById(id: string, data: Record<string, any>): Promise<Node> {
    let node: Node;

    try {
      node = await this.node.findByIdAndUpdate(id, data, { new: true });
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    if (!node) {
      throw new NotFoundException('Node not found');
    }

    return node;
  }

  async updateOne(
    filter: Record<string, any>,
    data: Record<string, any>,
  ): Promise<Node | null> {
    try {
      const node = await this.node.findOneAndUpdate(filter, data, {
        new: true,
      });
      return node;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async updateMany(filter: Record<string, any>, update: Record<string, any>) {
    try {
      const result = await this.node.updateMany(filter, update);
      return result;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async bulkSave(data: Node[]) {
    try {
      const result = await this.node.bulkSave(data);
      return result;
    } catch (err) {
      throw new UnprocessableEntityException(err.message);
    }
  }

  async deleteById(id: string) {
    let deletedCount = 0;

    try {
      const result = await this.node.deleteOne({ _id: id }).exec();
      deletedCount = result.deletedCount;
    } catch (err) {
      throw new BadRequestException(err.message);
    }

    if (deletedCount <= 0) {
      throw new NotFoundException('Node not found');
    }
  }
}
