import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('my-summary')
  @ApiOperation({ summary: 'Member dashboard summary — 1 call, all data' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved',
    schema: {
      example: {
        user: { name: 'Daniel', username: 'daniel' },
        stats: {
          total_tickets: 4,
          groups_joined: 1,
          total_referrals: 12,
          pending_payments: 2,
        },
        active_groups: [
          {
            id: 'uuid',
            name: 'Arisan Iphone Group C Updated',
            status: 'active',
            member_count: 2,
            max_members: 25,
            draw_date: '2025-01-01T00:00:00Z',
            my_ticket_count: 2,
          },
        ],
        tickets_need_payment: [
          {
            id: 'uuid',
            ticket_code: 'TKT-B08D29',
            group_name: 'Arisan Iphone Group C Updated',
            amount: 20000000,
          },
        ],
        referral_code: 'Xk9mP2',
      },
    },
  })
  getMemberSummary(@CurrentUser('id') userId: string) {
    return this.dashboardService.getMemberSummary(userId);
  }
}
