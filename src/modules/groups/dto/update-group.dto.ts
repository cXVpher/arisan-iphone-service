import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class UpdateGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  max_members?: number;

  @IsDateString()
  @IsOptional()
  next_draw_date?: string;

  @IsNumber()
  @IsOptional()
  ticket_price?: number;

  @IsString()
  @IsOptional()
  prize?: string;
}
