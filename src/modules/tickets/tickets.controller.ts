import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { BuyTicketDto } from './dto/buy-ticket.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('tickets')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('buy')
  buy(@Body() dto: BuyTicketDto) {
    return this.ticketsService.buyTicket(dto);
  }

  @Get()
  findByUserAndGroup(
    @Query('userId') userId: string,
    @Query('groupId') groupId: string,
  ) {
    return this.ticketsService.findByUserAndGroup(userId, groupId);
  }
}
