import { IsUUID, IsNotEmpty } from 'class-validator';

export class BuyTicketDto {
  @IsUUID()
  @IsNotEmpty()
  group_id: string;
}
