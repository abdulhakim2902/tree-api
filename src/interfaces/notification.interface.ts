import mongoose from 'mongoose';
import { NotificationType } from 'src/enums/notification-type.enum';
import { RelatedDocument } from 'src/enums/related-document.enum';

export interface CreateNotification {
  read: boolean;
  type: NotificationType;
  message: string;
  additionalData?: string;
  to?: mongoose.Schema.Types.ObjectId;
  relatedModel?: RelatedDocument;
  relatedModelId?: mongoose.Schema.Types.ObjectId;
  action: boolean;
}
