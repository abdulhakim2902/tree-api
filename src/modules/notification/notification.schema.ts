import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../user/user.schema';
import { NotificationType } from 'src/enums/notification-type.enum';

@Schema({
  collection: 'notifications',
  versionKey: false,
  timestamps: true,
})
export class Notification extends Document {
  @Prop({
    type: String,
    required: true,
    enum: NotificationType,
  })
  type: NotificationType;

  @Prop({
    type: String,
    required: false,
  })
  referenceId: string;

  @Prop({
    type: String,
    required: true,
  })
  message: string;

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
  read: boolean;

  @Prop({
    type: Boolean,
    required: true,
  })
  action: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
