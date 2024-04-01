import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from 'src/enums/role.enum';

@Schema({
  collection: 'userRequests',
  versionKey: false,
  timestamps: true,
})
export class UserRequest extends Document {
  @Prop({
    type: String,
    unique: true,
    required: true,
    index: true,
  })
  email: string;

  @Prop({
    type: String,
    required: true,
  })
  currentRole: Role;

  @Prop({
    type: String,
    required: true,
  })
  requestedRole: Role;
}

export const UserRequestSchema = SchemaFactory.createForClass(UserRequest);
