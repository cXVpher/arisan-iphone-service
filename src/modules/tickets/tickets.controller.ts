import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { BuyTicketDto } from './dto/buy-ticket.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Tickets')
@ApiBearerAuth('JWT')
@Controller('tickets')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('buy')
  @ApiOperation({ summary: 'Purchase a ticket' })
  @ApiResponse({
    status: 201,
    description: 'Ticket purchased successfully',
    schema: {
      example: {
        id: 'uuid',
        user_id: 1,
        group_id: 'uuid',
        status: 'ACTIVE',
        created_at: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  buy(@Body() dto: BuyTicketDto) {
    return this.ticketsService.buyTicket(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get tickets by user and group' })
  @ApiQuery({
    name: 'userId',
    type: String,
    description: 'User ID',
    required: true,
  })
  @ApiQuery({
    name: 'groupId',
    type: String,
    description: 'Group ID',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Tickets retrieved',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            user_id: 1,
            group_id: 'uuid',
            status: 'ACTIVE',
          },
        ],
      },
    },
  })
  findByUserAndGroup(
    @Query('userId') userId: string,
    @Query('groupId') groupId: string,
  ) {
    return this.ticketsService.findByUserAndGroup(userId, groupId);
  }
}
