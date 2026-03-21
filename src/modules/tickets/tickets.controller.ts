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

const ticketExample = {
  id: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
  ticket_code: 'TKT-A3F2B1',
  status: 'pending_payment',
  created_at: '2026-03-15T14:30:00.000Z',
  user: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'johndoe',
    name: 'John Doe',
  },
  group: {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Arisan iPhone 16 Pro Max',
  },
};

@ApiTags('Tickets')
@ApiBearerAuth('JWT')
@Controller('tickets')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('buy')
  @ApiOperation({ summary: 'Purchase a ticket for a group' })
  @ApiResponse({
    status: 201,
    description: 'Ticket purchased successfully',
    schema: {
      example: ticketExample,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Group is not active',
    schema: {
      example: {
        statusCode: 400,
        message: 'Tickets can only be purchased for active groups',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  buy(@Body() dto: BuyTicketDto, @CurrentUser() user: User) {
    return this.ticketsService.buyTicket(dto, user.id);
  }

  @Get('my-tickets')
  @ApiOperation({ summary: 'Get all tickets for current user' })
  @ApiResponse({
    status: 200,
    description: 'User tickets retrieved',
    schema: {
      example: [ticketExample],
    },
  })
  findMyTickets(@CurrentUser() user: User) {
    return this.ticketsService.findByUser(user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get tickets by user and group' })
  @ApiQuery({
    name: 'userId',
    type: String,
    description: 'User ID (UUID)',
    required: true,
  })
  @ApiQuery({
    name: 'groupId',
    type: String,
    description: 'Group ID (UUID)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Tickets retrieved',
    schema: {
      example: [ticketExample],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Missing query params',
    schema: {
      example: {
        statusCode: 400,
        message: 'userId and groupId query params are required',
        error: 'Bad Request',
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
