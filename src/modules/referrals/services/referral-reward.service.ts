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

    // Get all rewards for this referrer
    const rewards = await this.rewardRepo.find({
      where: { referrer_id: userId },
      relations: ['source_user'],
    });

    const totalEarned = rewards.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalPending = rewards
      .filter((r) => r.status === RewardStatus.PENDING)
      .reduce((sum, r) => sum + Number(r.amount), 0);
    const totalPaid = rewards
      .filter((r) => r.status === RewardStatus.PAID)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    // Count unique children
    const uniqueChildren = new Set(rewards.map((r) => r.source_user_id)).size;

    return {
      total_referrals: uniqueChildren,
      total_earned: totalEarned,
      total_pending: totalPending,
      total_paid: totalPaid,
    };
  }

  async getReferralList(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'referral_code'],
    });
    if (!user) throw new NotFoundException('User not found');

    // Get all rewards
    const rewards = await this.rewardRepo.find({
      where: { referrer_id: userId },
      relations: ['source_user', 'ticket', 'ticket.group'],
    });

    // Group by source user
    const childrenMap = new Map();
    rewards.forEach((reward) => {
      const childId = reward.source_user_id;
      if (!childrenMap.has(childId)) {
        childrenMap.set(childId, {
          user: {
            id: reward.source_user.id,
            name: reward.source_user.name,
            username: reward.source_user.username,
          },
          joined_at: reward.source_user.created_at,
          tickets: [],
          total_earned: 0,
          status_breakdown: { pending: 0, paid: 0 },
        });
      }

      const child = childrenMap.get(childId);
      child.tickets.push({
        id: reward.ticket_id,
        amount: Number(reward.amount),
        status: reward.status,
      });
      child.total_earned += Number(reward.amount);
      if (reward.status === RewardStatus.PENDING) {
        child.status_breakdown.pending += Number(reward.amount);
      } else {
        child.status_breakdown.paid += Number(reward.amount);
      }
    });

    const children = Array.from(childrenMap.values()).map((child) => ({
      ...child,
      tickets_bought: child.tickets.length,
      tickets: undefined,
    }));

    return {
      referral_code: user.referral_code,
      referral_link: `https://ariphone.online/ref/${user.referral_code}`,
      bonus_rate: '5%',
      children,
      summary: {
        total_children: children.length,
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
