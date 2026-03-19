import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        name: 'John Doe',
        role: 'MEMBER',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request or user already exists' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'user@example.com',
          name: 'John Doe',
          role: 'MEMBER',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('check-referral')
  @ApiOperation({ summary: 'Check if referral code is valid' })
  @ApiResponse({
    status: 200,
    description: 'Referral code is valid',
    schema: {
      example: {
        valid: true,
        referrer_name: 'John Doe',
        referrer_username: 'johndoe',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Code is required' })
  @ApiResponse({ status: 404, description: 'Referral code not found' })
  checkReferral(@Query('code') code: string) {
    return this.authService.checkReferral(code);
  }
}
