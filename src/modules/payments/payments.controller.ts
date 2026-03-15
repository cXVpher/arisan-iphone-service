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
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentStatus } from './entities/payment.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';

@Controller('payments')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments
   * multipart/form-data: ticket_id, user_id, amount, file
   */
  @Post()
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
  findAll(@Query('status') status?: PaymentStatus) {
    return this.paymentsService.findAll(status);
  }

  @Patch(':id/verify')
  @Roles(Role.ADMIN)
  verify(@Param('id') id: string, @Body() dto: VerifyPaymentDto) {
    return this.paymentsService.verifyOrReject(id, dto);
  }
}
