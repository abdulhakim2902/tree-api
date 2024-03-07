import * as bcrypt from 'bcrypt';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Node } from '../node/schemas/node.schema';

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
  })
  profilImageURL: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Node.name,
  })
  node: Node;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.loadClass(User);
UserSchema.pre('save', function () {
  if (!this.isNew) return;
  const password = this.password;
  const salt = bcrypt.genSaltSync(10);

  this.password = bcrypt.hashSync(password, salt);
});

UserSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  for (const key in update) {
    if (key === '$set') {
      for (const field in update[key]) {
        if (field === 'password') {
          console.log(field);
          const password = update[key][field];
          const salt = bcrypt.genSaltSync(10);

          update[key][field] = bcrypt.hashSync(password, salt);
        }
      }
    }
  }
});
