import mongoose, { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  ParentRelationType,
  RelationType,
  SpouseRelationType,
} from 'src/enums/relation-type.enum';

@Schema()
export class NodeRelation extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  })
  id: string;

  @Prop({
    type: String,
    required: true,
  })
  type: RelationType | SpouseRelationType | ParentRelationType;
}

export const NodeRelationSchema = SchemaFactory.createForClass(NodeRelation);

NodeRelationSchema.loadClass(NodeRelation);
