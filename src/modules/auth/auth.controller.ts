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
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
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
        id: '550e8400-e29b-41d4-a716-446655440000',
        username: 'johndoe',
        referral_code: 'Ab3xK9mQ',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid referral code',
    schema: {
      example: {
        statusCode: 400,
        message: 'Kode sponsor tidak valid',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Username or NIK already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'Username sudah digunakan',
        error: 'Conflict',
      },
    },
  })
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
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ1c2VybmFtZSI6ImpvaG5kb2UiLCJyb2xlIjoibWVtYmVyIiwiaWF0IjoxNzExMDAwMDAwfQ.abc123',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          username: 'johndoe',
          name: 'John Doe',
          role: 'member',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Username atau password salah',
        error: 'Unauthorized',
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('check-referral')
  @ApiOperation({ summary: 'Check if referral code is valid' })
  @ApiQuery({ name: 'code', type: String, description: 'Referral code to check', required: true })
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
  @ApiResponse({
    status: 400,
    description: 'Code is required',
    schema: {
      example: {
        statusCode: 400,
        message: 'Kode tidak boleh kosong',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Referral code not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Kode sponsor tidak valid',
        error: 'Not Found',
      },
    },
  })
  checkReferral(@Query('code') code: string) {
    return this.authService.checkReferral(code);
  }
}
