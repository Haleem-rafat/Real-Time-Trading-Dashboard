import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string, withPassword = false) {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (withPassword) query.select('+password');
    return query.exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async create(payload: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) {
    const created = await this.userModel.create({
      ...payload,
      email: payload.email.toLowerCase(),
    });
    return created;
  }
}
