import { Controller, Get, Post, Param, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReferralRewardService } from './services/referral-reward.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User, Role } from '../users/entities/user.entity';

@ApiTags('Referrals')
@ApiBearerAuth('JWT')
@Controller('referrals')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ReferralsController {
  constructor(private readonly rewardService: ReferralRewardService) {}

  @Get('my-summary')
  @ApiOperation({ summary: 'Get referral summary (earnings overview)' })
  @ApiResponse({
    status: 200,
    description: 'Referral summary',
    schema: {
      example: {
        total_referrals: 4,
        total_earned: 150000,
        total_pending: 126000,
        total_paid: 24000,
      },
    },
  })
  async getMySummary(@CurrentUser() user: User) {
    return this.rewardService.getReferralSummary(user.id);
  }

  @Get('my-list')
  @ApiOperation({ summary: 'Get detailed referral list with earning breakdown per child' })
  @ApiResponse({
    status: 200,
    description: 'Detailed referral list',
    schema: {
      example: {
        referral_code: 'Xk9mP2',
        referral_link: 'https://ariphone.online/ref/Xk9mP2',
        bonus_rate: '5%',
        children: [
          {
            user: {
              id: 'user-id-3',
              name: 'Siti Rahayu',
              username: 'siti_r',
            },
            joined_at: '2026-03-15T10:00:00.000Z',
            tickets_bought: 3,
            total_earned: 75000,
            status_breakdown: {
              pending: 50000,
              paid: 25000,
            },
          },
        ],
        summary: {
          total_children: 4,
          total_earned: 150000,
          total_pending: 126000,
          total_paid: 24000,
        },
      },
    },
  })
  async getMyList(@CurrentUser() user: User) {
    return this.rewardService.getReferralList(user.id);
  }

  @Post('request-payout')
  @ApiOperation({ summary: 'Request payout — mark all pending rewards as paid' })
  @ApiResponse({
    status: 200,
    description: 'Payout processed',
    schema: {
      example: {
        message: 'Payout processed',
        count: 5,
        total_amount: 150000,
      },
    },
  })
  async requestPayout(@CurrentUser() user: User) {
    return this.rewardService.requestPayout(user.id);
  }

  @Get('admin/users/:userId/referral-chain')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get referral chain for tracing (ADMIN only)' })
  @ApiResponse({
    status: 200,
    description: 'Referral chain',
    schema: {
      example: {
        user: {
          id: 'user-id-1',
          name: 'Daniel A.',
          username: 'daniel',
        },
        direct_referrals: [
          {
            user: {
              id: 'user-id-3',
              name: 'Siti Rahayu',
              username: 'siti_r',
            },
            joined_at: '2026-03-15T10:00:00.000Z',
            their_referrals: [
              {
                user: {
                  id: 'user-id-8',
                  name: 'Dewi Lestari',
                  username: 'dewi_l',
                },
                joined_at: '2026-03-20T10:00:00.000Z',
              },
            ],
          },
        ],
      },
    },
  })
  async getReferralChain(@Param('userId') userId: string) {
    return this.rewardService.getReferralChain(userId);
  }
}
