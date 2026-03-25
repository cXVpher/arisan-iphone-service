import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralReward, RewardStatus } from '../entities/referral-reward.entity';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Injectable()
export class ReferralRewardService {
  constructor(
    @InjectRepository(ReferralReward)
    private readonly rewardRepo: Repository<ReferralReward>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async createRewardIfEligible(
    sourceUserId: string,
    ticketId: string,
    slotPrice: number,
  ): Promise<ReferralReward | null> {
    // Get source user with referred_by
    const sourceUser = await this.userRepo.findOne({
      where: { id: sourceUserId },
      select: ['id', 'referred_by'],
    });

    if (!sourceUser || !sourceUser.referred_by) {
      return null; // No referrer, no reward
    }

    const referrerId = sourceUser.referred_by;
    const amount = Math.floor(slotPrice * 0.05); // 5% bonus, rounded down

    try {
      const reward = this.rewardRepo.create({
        referrer_id: referrerId,
        source_user_id: sourceUserId,
        ticket_id: ticketId,
        amount,
        status: RewardStatus.PENDING,
      });
      return this.rewardRepo.save(reward);
    } catch (error) {
      // Handle unique constraint violation (duplicate ticket_id)
      // This can happen if verifyOrReject is called multiple times
      if (error.code === 'ER_DUP_ENTRY') {
        return null; // Silently fail, reward already exists
      }
      throw error;
    }
  }

  async getReferralSummary(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Count total referrals from users.referred_by (semua anak yang daftar pakai kode ini)
    const [totalReferrals, rewards] = await Promise.all([
      this.userRepo.count({ where: { referred_by: userId } }),
      this.rewardRepo.find({ where: { referrer_id: userId } }),
    ]);

    const totalEarned = rewards.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalPending = rewards
      .filter((r) => r.status === RewardStatus.PENDING)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const totalPaid = rewards
      .filter((r) => r.status === RewardStatus.PAID)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      total_referrals: totalReferrals,
      total_earned: totalEarned,
      total_pending: totalPending,
      total_paid: totalPaid,
    };
  }

  async getReferralList(userId: string) {
    const [user, directChildren, rewards] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId }, select: ['id', 'referral_code'] }),
      this.userRepo.find({
        where: { referred_by: userId },
        select: ['id', 'name', 'username', 'created_at'],
      }),
      this.rewardRepo.find({
        where: { referrer_id: userId },
        relations: ['source_user', 'ticket', 'ticket.group'],
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');

    // Build reward map per source_user_id
    const rewardMap = new Map<string, { total_earned: number; status_breakdown: { pending: number; paid: number }; tickets_bought: number }>();
    rewards.forEach((reward) => {
      const childId = reward.source_user_id;
      if (!rewardMap.has(childId)) {
        rewardMap.set(childId, { total_earned: 0, status_breakdown: { pending: 0, paid: 0 }, tickets_bought: 0 });
      }
      const entry = rewardMap.get(childId)!;
      entry.total_earned += Number(reward.amount);
      entry.tickets_bought += 1;
      if (reward.status === RewardStatus.PENDING) {
        entry.status_breakdown.pending += Number(reward.amount);
      } else {
        entry.status_breakdown.paid += Number(reward.amount);
      }
    });

    // Merge all direct children with their earnings (0 jika belum ada reward)
    const children = directChildren.map((child) => {
      const earning = rewardMap.get(child.id) ?? { total_earned: 0, status_breakdown: { pending: 0, paid: 0 }, tickets_bought: 0 };
      return {
        user_id: child.id,
        name: child.name,
        username: child.username,
        joined_at: child.created_at,
        tickets_bought: earning.tickets_bought,
        total_earned: earning.total_earned,
        status_breakdown: earning.status_breakdown,
      };
    });

    return {
      referral_code: user.referral_code,
      referral_link: `https://ariphone.online/ref/${user.referral_code}`,
      bonus_rate: '5%',
      children,
      summary: {
        total_children: directChildren.length,
        total_earned: rewards.reduce((sum, r) => sum + Number(r.amount), 0),
        total_pending: rewards
          .filter((r) => r.status === RewardStatus.PENDING)
          .reduce((sum, r) => sum + Number(r.amount), 0),
        total_paid: rewards
          .filter((r) => r.status === RewardStatus.PAID)
          .reduce((sum, r) => sum + Number(r.amount), 0),
      },
    };
  }

  async requestPayout(userId: string) {
    // Mark all pending rewards as paid
    const rewards = await this.rewardRepo.find({
      where: { referrer_id: userId, status: RewardStatus.PENDING },
    });

    if (rewards.length === 0) {
      return { message: 'No pending rewards to payout', count: 0 };
    }

    const now = new Date();
    for (const reward of rewards) {
      reward.status = RewardStatus.PAID;
      reward.paid_at = now;
      await this.rewardRepo.save(reward);
    }

    const totalAmount = rewards.reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      message: 'Payout processed',
      count: rewards.length,
      total_amount: totalAmount,
    };
  }

  async getReferralChain(userId: string): Promise<any> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'username'],
    });

    if (!user) throw new NotFoundException('User not found');

    // Get all direct referrals
    const directReferrals = await this.userRepo.find({
      where: { referred_by: userId },
      select: ['id', 'name', 'username', 'created_at'],
    });

    // For each direct referral, get their referrals
    const directReferralsWithChain = await Promise.all(
      directReferrals.map(async (child) => {
        const grandchildren = await this.userRepo.find({
          where: { referred_by: child.id },
          select: ['id', 'name', 'username', 'created_at'],
        });

        return {
          user: {
            id: child.id,
            name: child.name,
            username: child.username,
          },
          joined_at: child.created_at,
          their_referrals: grandchildren.map((gc) => ({
            user: {
              id: gc.id,
              name: gc.name,
              username: gc.username,
            },
            joined_at: gc.created_at,
          })),
        };
      }),
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
      direct_referrals: directReferralsWithChain,
    };
  }
}
