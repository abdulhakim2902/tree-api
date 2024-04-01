import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { RelatedDocument } from 'src/enums/related-document.enum';
import { User } from '../user/schemas/user.schema';
import { NotificationType } from 'src/enums/notification-type.enum';

@Schema({
  collection: 'notifications',
  versionKey: false,
  timestamps: true,
})
export class Notification extends Document {
  @Prop({
    type: Boolean,
    required: true,
  })
  read: boolean;

  @Prop({
    type: String,
    required: true,
    enum: NotificationType,
  })
  type: NotificationType;

  @Prop({
    type: String,
    required: false,
    enum: RelatedDocument,
  })
  relatedModel: RelatedDocument;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: false,
  })
  relatedModelId: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  message: string;

  @Prop({
    type: String,
    required: false,
  })
  additionalData: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  to: User;

  @Prop({
    type: Boolean,
    required: true,
  })
  action: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
