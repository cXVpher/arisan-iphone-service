import {
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsUUID()
  @IsNotEmpty()
  ticket_id: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;
}
