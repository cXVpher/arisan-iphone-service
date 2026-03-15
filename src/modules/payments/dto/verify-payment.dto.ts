import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity';

export class VerifyPaymentDto {
  @IsEnum(['verified', 'rejected'])
  status: PaymentStatus.VERIFIED | PaymentStatus.REJECTED;

  @IsOptional()
  @IsString()
  note?: string;
}
