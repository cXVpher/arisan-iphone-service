import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentStatus } from './entities/payment.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, Role } from '../users/entities/user.entity';

const paymentExample = {
  id: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
  amount: 500000,
  status: 'pending',
  proof_url: 'https://s3.ap-southeast-1.amazonaws.com/bucket/payments/proof-123.jpg',
  note: null,
  created_at: '2026-03-15T15:00:00.000Z',
  updated_at: '2026-03-15T15:00:00.000Z',
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'johndoe',
    name: 'John Doe',
  },
  ticket: {
    id: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
    ticket_code: 'TKT-A3F2B1',
    status: 'pending_payment',
    group: {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      name: 'Arisan iPhone 16 Pro Max',
    },
  },
};

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@Controller('payments')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create payment with proof document',
    description:
      'Upload payment proof (image or PDF). Accepts JPEG, PNG, WebP, or PDF files up to 5MB',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      example: paymentExample,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file, missing proof, or ticket status mismatch',
    schema: {
      example: {
        statusCode: 400,
        message: 'File bukti pembayaran wajib diupload',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        const allowed = /image\/(jpeg|png|webp)|application\/pdf/;
        if (!allowed.test(file.mimetype)) {
          return cb(
            new BadRequestException('Only images (JPEG/PNG/WebP) and PDF allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  create(
    @Body() dto: CreatePaymentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) throw new BadRequestException('File bukti pembayaran wajib diupload');
    return this.paymentsService.createPayment(dto, file, user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all payments (ADMIN only)' })
  @ApiQuery({
    name: 'status',
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    required: false,
    description: 'Filter by payment status',
  })
  @ApiResponse({
    status: 200,
    description: 'Payments list retrieved',
    schema: {
      example: [paymentExample],
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  findAll(@Query('status') status?: PaymentStatus) {
    return this.paymentsService.findAll(status);
  }

  @Patch(':id/verify')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Verify or reject payment (ADMIN only)' })
  @ApiParam({ name: 'id', type: String, description: 'Payment ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Payment verified/rejected successfully',
    schema: {
      example: {
        ...paymentExample,
        status: 'verified',
        note: 'Pembayaran sudah dikonfirmasi',
        updated_at: '2026-03-15T16:00:00.000Z',
        ticket: {
          ...paymentExample.ticket,
          status: 'paid',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Payment is already verified/rejected' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  verify(@Param('id') id: string, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyOrReject(id, dto);
  }
}
