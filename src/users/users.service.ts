import {
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(userData: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({
      email: userData.email,
    });
    if (existingUser) {
      const errorMessage = `User with email ${userData.email} already exists.`;
      throw new ConflictException(errorMessage);
    }

    const salt = await bcrypt.genSalt();
    userData.password = await bcrypt.hash(userData.password, salt);
    const user = new this.userModel(userData);
    const savedUser = await user.save();
    const userObject = savedUser.toObject();
    delete (userObject as any).password;
    return userObject as UserDocument;
  }

  async findOneById(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      const errorMessage = `User with ID ${id} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return user;
  }
  async findOneByEmail(
    email: string,
    select?: string[],
  ): Promise<UserDocument> {
    let query = this.userModel.findOne({ email });

    if (select) {
      query = query.select(select.join(' ')) as any;
    }

    const user = await query.exec();
    if (!user) {
      const errorMessage = `User with email ${email} not found.`;
      throw new NotFoundException(errorMessage);
    }
    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel.findById(id);

    if (!user) {
      const errorMessage = `User with ID ${id} not found.`;
      throw new NotFoundException(errorMessage);
    }

    if ('password' in updateUserDto) {
      delete updateUserDto.password;
    }

    Object.assign(user, updateUserDto);
    return await user.save();
  }

  async save(user: UserDocument): Promise<UserDocument> {
    return await user.save();
  }
}
