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
import { Role } from '../users/entities/user.entity';

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
      example: {
        id: 'uuid',
        user_id: 1,
        group_id: 'uuid',
        ticket_id: 'uuid',
        amount: 100000,
        status: 'PENDING',
        proof_url: 'https://...',
        created_at: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file or data' })
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
  ) {
    if (!file) throw new BadRequestException('File bukti pembayaran wajib diupload');
    return this.paymentsService.createPayment(dto, file);
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
      example: {
        data: [
          {
            id: 'uuid',
            user_id: 1,
            group_id: 'uuid',
            amount: 100000,
            status: 'PENDING',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  findAll(@Query('status') status?: PaymentStatus) {
    return this.paymentsService.findAll(status);
  }

  @Patch(':id/verify')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Verify or reject payment (ADMIN only)' })
  @ApiParam({ name: 'id', type: String, description: 'Payment ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment verified/rejected successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  verify(@Param('id') id: string, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyOrReject(id, dto);
  }
}
