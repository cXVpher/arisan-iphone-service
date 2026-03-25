import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { ReferralReward } from '../referrals/entities/referral-reward.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Ticket, GroupMember, ReferralReward])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
