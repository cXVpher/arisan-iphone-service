import { IsString, IsDateString, IsNotEmpty } from 'class-validator';

export class ActivateGroupDto {
  @IsDateString()
  @IsNotEmpty()
  next_draw_date: string;
}
