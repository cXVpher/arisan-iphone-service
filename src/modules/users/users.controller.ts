import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User, Role } from './entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class UsersController {
  constructor(private usersService: UsersService) {}

  /**
   * GET /users/me
   * Get logged-in user's profile (MEMBER+)
   */
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  /**
   * PATCH /users/me
   * Update logged-in user's profile (MEMBER+)
   */
  @Patch('me')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  /**
   * PATCH /users/me/password
   * Change password (MEMBER+)
   */
  @Patch('me/password')
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(user.id, dto);
    return { message: 'Password berhasil diubah' };
  }

  /**
   * GET /users
   * List all users (ADMIN only)
   */
  @Get()
  @Roles(Role.ADMIN)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(page || 1, limit || 20, search);
  }

  /**
   * GET /users/:id
   * Get user by ID (ADMIN only)
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }
}
