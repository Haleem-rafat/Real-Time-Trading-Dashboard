import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      if (ret.createdAt) {
        ret.created_at = ret.createdAt;
        delete ret.createdAt;
      }
      if (ret.updatedAt) {
        ret.updated_at = ret.updatedAt;
        delete ret.updatedAt;
      }
      return ret;
    },
  },
})
export class User {
  id?: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ trim: true })
  first_name?: string;

  @Prop({ trim: true })
  last_name?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
