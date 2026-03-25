import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    await this.userRepo.update(userId, dto);
    return this.getProfile(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.old_password, user.password_hash);
    if (!isValid) throw new BadRequestException('Password lama salah');

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(dto.new_password, salt);
    await this.userRepo.update(userId, { password_hash: newHash });
  }

  async findAll(page: number = 1, limit: number = 20, search?: string) {
    const qb = this.userRepo.createQueryBuilder('user');

    if (search) {
      qb.where('user.username LIKE :search OR user.name LIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['referrer'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      ...user,
      referred_by: user.referrer
        ? { id: user.referrer.id, username: user.referrer.username, name: user.referrer.name }
        : null,
      referrer: undefined,
    };
  }
}
