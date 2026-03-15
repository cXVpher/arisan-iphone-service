import { IsUUID, IsNotEmpty } from 'class-validator';

export class BuyTicketDto {
  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsUUID()
  @IsNotEmpty()
  group_id: string;
}
