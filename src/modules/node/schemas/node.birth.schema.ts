import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
class BirthPlace extends Document {
  @Prop({
    type: String,
    lowercase: true,
    default: '',
  })
  city: string;

  @Prop({
    type: String,
    lowercase: true,
    default: '',
  })
  country: string;
}

const BirthPlaceSchema = SchemaFactory.createForClass(BirthPlace);

@Schema()
export class NodeBirth extends Document {
  @Prop({
    type: Number,
    required: false,
    default: -1,
  })
  year: number;

  @Prop({
    type: Number,
    required: false,
    default: 0,
  })
  month: number;

  @Prop({
    type: Number,
    required: false,
    default: 0,
  })
  day: number;

  @Prop({
    _id: false,
    type: BirthPlaceSchema,
    required: false,
  })
  place: BirthPlace;
}

export const NodeBirthSchema = SchemaFactory.createForClass(NodeBirth);
