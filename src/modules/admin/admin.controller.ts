import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminStatsService } from './services/admin-stats.service';
import { ActivityLogService } from './services/activity-log.service';
import { GetActivityQueryDto } from './dto/get-activity-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';

@ApiTags('Admin')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AdminController {
  constructor(
    private readonly adminStatsService: AdminStatsService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved',
    schema: {
      example: {
        groups: {
          total: 12,
          by_status: {
            pending: 3,
            waiting: 4,
            full: 2,
            active: 2,
            completed: 1,
          },
        },
        members: {
          total_users: 89,
          total_slots_filled: 142,
        },
        payments: {
          total_verified: 2840000000,
          pending_review: 5,
        },
        action_items: {
          groups_without_ketua: 4,
          groups_full_not_activated: 2,
          payments_pending: 5,
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async getStats() {
    return this.adminStatsService.getStats();
  }

  @Get('activity')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get recent activity logs with cursor pagination' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Items per page (1-50)', example: 20 })
  @ApiQuery({ name: 'cursor', type: String, required: false, description: 'Activity ID from previous page' })
  @ApiQuery({ name: 'action', type: String, required: false, description: 'Filter by action code' })
  @ApiResponse({
    status: 200,
    description: 'Activity logs retrieved',
    schema: {
      example: {
        items: [
          {
            id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            action: 'member_joined',
            target_type: 'group',
            target_id: '1acd5a78-e29b-41d4-a716-446655440000',
            metadata: {
              group_name: 'Arisan iPhone Group C',
              member_name: 'Daniel Baru',
            },
            actor: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Daniel Baru',
              username: 'daniel_baru',
            },
            created_at: '2026-03-20T21:39:39.819Z',
          },
          {
            id: 'e5f6g7h8-i9j0-1234-abcd-ef1234567890',
            action: 'group_activated',
            target_type: 'group',
            target_id: '1acd5a78-e29b-41d4-a716-446655440000',
            metadata: {
              group_name: 'Arisan iPhone Group C',
              draw_date: '2026-04-15',
            },
            actor: {
              id: 'a32db727-e29b-41d4-a716-446655440000',
              name: 'Admin',
              username: 'admin',
            },
            created_at: '2026-03-20T21:42:45.000Z',
          },
        ],
        next_cursor: 'e5f6g7h8-i9j0-1234-abcd-ef1234567890',
        has_more: true,
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async getActivity(@Query() query: GetActivityQueryDto) {
    const { items, next_cursor, has_more } = await this.activityLogService.findRecent(
      query.limit,
      query.cursor,
      query.action as any,
    );

    return {
      items,
      next_cursor,
      has_more,
    };
  }
}
