import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class NodeName extends Document {
  @Prop({
    type: String,
    lowercase: true,
    required: true,
    trim: true,
  })
  first: string;

  @Prop({
    type: String,
    lowercase: true,
    required: false,
    trim: true,
  })
  middle: string;

  @Prop({
    type: String,
    lowercase: true,
    required: false,
    trim: true,
  })
  last: string;

  @Prop({
    type: [{ type: String, lowercase: true, trim: true }],
    required: false,
  })
  nicknames: string[];
}

export const NodeNameSchema = SchemaFactory.createForClass(NodeName);
