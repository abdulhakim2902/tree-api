import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class NodeNickname extends Document {
  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  })
  name: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  selected: boolean;
}

const NodeNicknameSchema = SchemaFactory.createForClass(NodeNickname);

NodeNicknameSchema.loadClass(NodeNickname);

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
    _id: false,
    type: [NodeNicknameSchema],
    required: false,
  })
  nicknames: NodeNickname[];
}

export const NodeNameSchema = SchemaFactory.createForClass(NodeName);
