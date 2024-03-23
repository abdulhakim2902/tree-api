import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NodeController } from './node.controller';
import { NodeService } from './node.service';
import { User, UserSchema } from 'src/modules/user/user.schema';
import { Node, NodeSchema } from 'src/modules/node/schemas/node.schema';
import { NodeRepository } from 'src/modules/node/node.repository';
import { FileRepository } from '../file/file.repository';
import { File, FileSchema } from '../file/file.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: File.name, schema: FileSchema },
      { name: User.name, schema: UserSchema },
      { name: Node.name, schema: NodeSchema },
    ]),
  ],
  controllers: [NodeController],
  providers: [NodeService, NodeRepository, FileRepository],
})
export class NodeModule {}
