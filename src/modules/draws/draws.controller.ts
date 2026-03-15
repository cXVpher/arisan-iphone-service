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

@ApiTags('Draws')
@ApiBearerAuth('JWT')
@Controller('draws')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class DrawsController {
  constructor(private readonly drawsService: DrawsService) {}

  @Post(':groupId/spin')
  @ApiOperation({
    summary: 'Trigger draw/spin (ketua only)',
    description: 'Only the group ketua/leader can trigger the draw',
  })
  @ApiParam({ name: 'groupId', type: String, description: 'Group ID' })
  @ApiQuery({
    name: 'userId',
    type: String,
    description: 'Ketua user ID',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Draw spin triggered successfully',
    schema: {
      example: {
        id: 'uuid',
        group_id: 'uuid',
        winner_id: 1,
        spin_number: 1,
        status: 'COMPLETED',
        created_at: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - ketua access required' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  spin(
    @Param('groupId') groupId: string,
    @Query('userId') userId: string,
  ) {
    return this.drawsService.spin(groupId, userId);
  }

  @Get(':groupId/result')
  @ApiOperation({ summary: 'Get latest draw result for a group' })
  @ApiParam({ name: 'groupId', type: String, description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Draw result retrieved',
    schema: {
      example: {
        id: 'uuid',
        group_id: 'uuid',
        winner: {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
        },
        spin_number: 1,
        status: 'COMPLETED',
        created_at: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Group or draw result not found' })
  getResult(@Param('groupId') groupId: string) {
    return this.drawsService.getDrawResult(groupId);
  }

  @Get(':groupId/history')
  @ApiOperation({ summary: 'Get all draw records for a group' })
  @ApiParam({ name: 'groupId', type: String, description: 'Group ID' })
  @ApiResponse({
    status: 200,
    description: 'Draw history retrieved',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            group_id: 'uuid',
            winner_id: 1,
            spin_number: 1,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  getHistory(@Param('groupId') groupId: string) {
    return this.drawsService.getHistory(groupId);
  }
}
