import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'files', timestamps: true, versionKey: false })
export class File extends Document {
  @Prop({
    type: String,
    required: true,
  })
  publicId: string;

  @Prop({
    type: String,
    required: true,
  })
  assetId: string;

  @Prop({
    type: String,
    required: true,
  })
  url: string;
}

export const FileSchema = SchemaFactory.createForClass(File);
