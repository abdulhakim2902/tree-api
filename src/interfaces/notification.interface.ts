import mongoose from 'mongoose';
import { NotificationType } from 'src/enums/notification-type.enum';

export interface CreateNotification {
  type: NotificationType;
  message: string;
  to: mongoose.Schema.Types.ObjectId;
  referenceId?: string;
  action: boolean;
  read: boolean;
}
