import mongoose, { Document } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class NodeFamily extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
  })
  id: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: String,
    lowercase: true,
    trim: true,
  })
  name: string;
}

export const NodeFamilySchema = SchemaFactory.createForClass(NodeFamily);

NodeFamilySchema.loadClass(NodeFamily);
