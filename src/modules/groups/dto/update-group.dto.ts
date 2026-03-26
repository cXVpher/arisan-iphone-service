import { IsString, IsOptional, IsNumber, IsDateString, IsBoolean, IsIn } from 'class-validator';
import { GROUP_ICONS } from './create-group.dto';
import type { GroupIcon } from './create-group.dto';

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

  @IsBoolean()
  @IsOptional()
  is_hidden?: boolean;

  @IsIn(GROUP_ICONS)
  @IsOptional()
  icon?: GroupIcon;
}
