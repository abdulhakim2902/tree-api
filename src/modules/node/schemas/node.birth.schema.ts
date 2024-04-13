import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
class BirthPlace extends Document {
  @Prop({
    type: String,
    lowercase: true,
  })
  city: string;

  @Prop({
    type: String,
    lowercase: true,
  })
  country: string;
}

const BirthPlaceSchema = SchemaFactory.createForClass(BirthPlace);

@Schema()
export class NodeBirth extends Document {
  @Prop({
    type: Number,
    required: false,
  })
  year: number;

  @Prop({
    type: Number,
    required: false,
  })
  month: number;

  @Prop({
    type: Number,
    required: false,
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
