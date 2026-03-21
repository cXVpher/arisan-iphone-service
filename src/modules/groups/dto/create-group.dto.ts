import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  ticket_price?: number;

  @IsString()
  @IsOptional()
  prize?: string;
}
