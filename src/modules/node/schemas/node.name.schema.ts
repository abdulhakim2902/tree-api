import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class NodeName extends Document {
  @Prop({
    type: String,
    lowercase: true,
    required: true,
  })
  first: string;

  @Prop({
    type: String,
    lowercase: true,
    required: false,
  })
  middle: string;

  @Prop({
    type: String,
    lowercase: true,
    required: false,
  })
  last: string;

  @Prop({
    type: [{ type: String, lowercase: true }],
    required: false,
  })
  nicknames: string[];
}

export const NodeNameSchema = SchemaFactory.createForClass(NodeName);
