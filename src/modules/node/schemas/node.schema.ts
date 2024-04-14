import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Gender } from 'src/enums/gender.enum';
import { NodeName, NodeNameSchema } from './node.name.schema';
import { NodeBirth, NodeBirthSchema } from './node.birth.schema';
import { NodeRelation, NodeRelationSchema } from './node.relation.schema';
import {
  ParentRelationType,
  RelationType,
  SpouseRelationType,
} from 'src/enums/relation-type.enum';
import { BadRequestException } from '@nestjs/common';
import { MONTHS } from 'src/constants/month';
import { omit } from 'lodash';
import { NodeFamily, NodeFamilySchema } from './node.family.schema';
import { startCase } from 'src/helper/string';
import { File } from 'src/modules/file/file.schema';

export type NodeDocument = Node & Document;

@Schema({
  collection: 'nodes',
  versionKey: false,
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => omit(ret, ['_id']),
  },
})
export class Node extends Document {
  @Prop({
    _id: false,
    type: NodeNameSchema,
    required: true,
  })
  name: NodeName;

  @Prop({
    type: String,
    lowercase: true,
    required: true,
  })
  gender: Gender;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: File.name,
  })
  profileImage: File;

  @Prop({
    _id: false,
    type: NodeBirthSchema,
    required: false,
  })
  birth: NodeBirth;

  @Prop({
    _id: false,
    type: [NodeRelationSchema],
  })
  parents: NodeRelation[];

  @Prop({
    _id: false,
    type: [NodeRelationSchema],
  })
  children: NodeRelation[];

  @Prop({
    _id: false,
    type: [NodeRelationSchema],
  })
  spouses: NodeRelation[];

  @Prop({
    _id: false,
    type: [NodeRelationSchema],
  })
  siblings: NodeRelation[];

  @Prop({
    _id: false,
    type: [NodeFamilySchema],
  })
  families: NodeFamily[];

  @Prop({
    type: mongoose.Types.ObjectId,
    required: false,
  })
  userId: string;

  @Prop({
    type: Date,
    required: false,
  })
  deletedAt: string;

  totalParents(type: RelationType | ParentRelationType): number {
    return this.parents.filter((e) => e.type === type).length;
  }

  totalSpouses(type: SpouseRelationType): number {
    return this.spouses.filter((e) => e.type === type).length;
  }

  birthDate(): string {
    if (!this.birth) return;
    const month = MONTHS[this.birth.month - 1];
    return `${this.birth.day} ${month} ${this.birth.year}`;
  }

  maxSpouses(): number {
    if (this.gender === Gender.MALE) {
      return 4;
    }

    return 1;
  }

  get fullname(): string {
    let { first, middle, last } = this.name;
    if (!first) first = '';
    if (!middle) middle = '';
    if (!last) last = '';
    return startCase(`${first} ${middle} ${last}`);
  }
}

export const NodeSchema = SchemaFactory.createForClass(Node);

NodeSchema.loadClass(Node);
NodeSchema.pre('save', function () {
  if (!this.birth) return;
  const err = `Invalid birth date [${this.birthDate()}]`;
  if (this.birth.month === 2) {
    if (this.birth.day > 29) {
      throw new BadRequestException(err);
    }
    if (this.birth.year % 4 === 0) {
      if (this.birth.day > 29) {
        throw new BadRequestException(err);
      }
    }

    if (this.birth.day > 28) {
      throw new BadRequestException(err);
    }
    return;
  }
  if (this.birth.month < 8) {
    if (this.birth.month % 2 === 0) {
      if (this.birth.day > 30) {
        throw new BadRequestException(err);
      }
    }
  }

  if (this.birth.month % 2 !== 0) {
    if (this.birth.day > 30) {
      throw new BadRequestException(err);
    }
  }
});
