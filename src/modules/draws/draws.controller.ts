import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DrawsService } from './draws.service';

const drawExample = {
  id: 'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  group_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  status: 'completed',
  scheduled_date: '2026-04-15T00:00:00.000Z',
  winner_user_id: '550e8400-e29b-41d4-a716-446655440000',
  winner_ticket_id: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
  drawn_at: '2026-04-15T14:00:00.000Z',
  created_at: '2026-03-15T10:00:00.000Z',
  updated_at: '2026-04-15T14:00:00.000Z',
};

@ApiTags('Draws')
@ApiBearerAuth('JWT')
@Controller('draws')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DrawsController {
  constructor(private readonly drawsService: DrawsService) {}

  @Post(':groupId/spin')
  @ApiOperation({
    summary: 'Trigger draw/spin (ketua only)',
    description: 'Only the group ketua/leader can trigger the draw. The draw must be scheduled and the scheduled date must have passed.',
  })
  @ApiParam({ name: 'groupId', type: String, description: 'Group ID (UUID)' })
  @ApiQuery({
    name: 'userId',
    type: String,
    description: 'Ketua user ID (UUID)',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Draw spin completed successfully',
    schema: {
      example: drawExample,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Group not active, no active tickets, or draw date not reached',
    schema: {
      example: {
        statusCode: 400,
        message: 'Draw is not yet available. Scheduled for 2026-04-15',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Only ketua can perform the spin',
    schema: {
      example: {
        statusCode: 403,
        message: 'Only the ketua can perform the spin',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Group or scheduled draw not found' })
  spin(
    @Param('groupId') groupId: string,
    @Query('userId') userId: string,
  ) {
    return this.drawsService.spin(groupId, userId);
  }

  @Get(':groupId/result')
  @ApiOperation({ summary: 'Get latest draw result for a group' })
  @ApiParam({ name: 'groupId', type: String, description: 'Group ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Draw result retrieved',
    schema: {
      example: drawExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No completed draw found',
    schema: {
      example: {
        statusCode: 404,
        message: 'No completed draw found for this group',
        error: 'Not Found',
      },
    },
  })
  getResult(@Param('groupId') groupId: string) {
    return this.drawsService.getDrawResult(groupId);
  }

  @Get(':groupId/history')
  @ApiOperation({ summary: 'Get all draw records for a group' })
  @ApiParam({ name: 'groupId', type: String, description: 'Group ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Draw history retrieved',
    schema: {
      example: [
        drawExample,
        {
          id: 'e2f3a4b5-c6d7-8901-abcd-ef1234567890',
          group_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          status: 'scheduled',
          scheduled_date: '2026-05-15T00:00:00.000Z',
          winner_user_id: null,
          winner_ticket_id: null,
          drawn_at: null,
          created_at: '2026-04-15T14:00:00.000Z',
          updated_at: '2026-04-15T14:00:00.000Z',
        },
      ],
    },
  })
  getHistory(@Param('groupId') groupId: string) {
    return this.drawsService.getHistory(groupId);
  }
}
