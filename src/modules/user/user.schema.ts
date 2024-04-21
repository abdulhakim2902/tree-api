import * as bcrypt from 'bcrypt';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { startCase } from 'src/helper/string';
import { Role } from 'src/enums/role.enum';
import { File } from '../file/file.schema';

export type UserDocument = User & Document;

@Schema({
  collection: 'users',
  versionKey: false,
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => Object.assign(ret, { _id: undefined }),
  },
})
export class User extends Document {
  @Prop({
    type: String,
    unique: true,
    required: true,
    index: true,
  })
  email: string;

  @Prop({
    type: String,
    lowercase: true,
    unique: true,
    immutable: true,
    required: true,
    index: true,
  })
  username: string;

  @Prop({
    type: String,
    required: true,
  })
  password: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
  })
  role: Role;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: File.name,
  })
  profileImage: File;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.loadClass(User);
UserSchema.pre('save', function () {
  this.name = startCase(this.name);
  if (!this.isNew) return;
  const password = this.password;
  const salt = bcrypt.genSaltSync(10);

  this.password = bcrypt.hashSync(password, salt);
});
