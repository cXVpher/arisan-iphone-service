import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralsController } from './referrals.controller';
import { ReferralRewardService } from './services/referral-reward.service';
import { ReferralReward } from './entities/referral-reward.entity';
import { User } from '../users/entities/user.entity';
import { Ticket } from '../tickets/entities/ticket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReferralReward, User, Ticket])],
  controllers: [ReferralsController],
  providers: [ReferralRewardService],
  exports: [ReferralRewardService],
})
export class ReferralsModule {}
