import mongoose, { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Node } from './node.schema';
import {
  ParentRelationType,
  RelationType,
  SpouseRelationType,
} from 'src/enums/relation-type.enum';
import { Gender } from 'src/enums/gender.enum';

@Schema()
export class NodeRelation extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Node',
  })
  id: Node;

  @Prop({
    type: String,
    lowercase: true,
  })
  gender?: Gender;

  @Prop({
    type: String,
    required: true,
  })
  type: RelationType | SpouseRelationType | ParentRelationType;
}

export const NodeRelationSchema = SchemaFactory.createForClass(NodeRelation);

NodeRelationSchema.loadClass(NodeRelation);
