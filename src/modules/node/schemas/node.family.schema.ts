import mongoose, { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Node } from './node.schema';

@Schema()
export class NodeFamily extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Node',
  })
  id: Node;

  @Prop({
    type: String,
    lowercase: true,
    trim: true,
  })
  name: string;
}

export const NodeFamilySchema = SchemaFactory.createForClass(NodeFamily);

NodeFamilySchema.loadClass(NodeFamily);
