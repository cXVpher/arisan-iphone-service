import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class JoinGroupDto {
  @IsUUID()
  @IsNotEmpty()
  user_id: string;
}
