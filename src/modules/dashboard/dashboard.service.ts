import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { ReferralReward } from '../referrals/entities/referral-reward.entity';
import { GroupStatus } from '../groups/entities/group.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Ticket) private ticketRepo: Repository<Ticket>,
    @InjectRepository(GroupMember) private memberRepo: Repository<GroupMember>,
    @InjectRepository(ReferralReward) private rewardRepo: Repository<ReferralReward>,
  ) {}

  async getMemberSummary(userId: string) {
    const user = await this.userRepo.findOneOrFail({ where: { id: userId } });

    const [totalTickets, groupsJoined, totalReferrals, ticketsNeedPayment, memberships] =
      await Promise.all([
        this.ticketRepo.count({ where: { user_id: userId } }),
        this.memberRepo.count({ where: { user_id: userId } }),
        this.rewardRepo.count({ where: { referrer_id: userId } }),
        this.ticketRepo.find({
          where: { user_id: userId, status: TicketStatus.PENDING_PAYMENT },
          relations: ['group'],
          order: { created_at: 'DESC' },
        }),
        this.memberRepo.find({
          where: { user_id: userId },
          relations: ['group'],
        }),
      ]);

    const activeGroups = await Promise.all(
      memberships
        .filter((m) => m.group.status !== GroupStatus.COMPLETED)
        .map(async (m) => {
          const [myTicketCount, memberCount, slotCount] = await Promise.all([
            this.ticketRepo.count({ where: { user_id: userId, group_id: m.group.id } }),
            this.memberRepo.count({ where: { group_id: m.group.id } }),
            this.ticketRepo.count({ where: { group_id: m.group.id, status: In([TicketStatus.PAID, TicketStatus.ACTIVE, TicketStatus.WON]) } }),
          ]);
          return {
            id: m.group.id,
            name: m.group.name,
            status: m.group.status,
            member_count: memberCount,
            slot_count: slotCount,
            max_members: m.group.max_members,
            max_slots: m.group.max_members,
            draw_date: m.group.next_draw_date,
            my_ticket_count: myTicketCount,
          };
        }),
    );

    return {
      user: { name: user.name, username: user.username },
      stats: {
        total_tickets: totalTickets,
        groups_joined: groupsJoined,
        total_referrals: totalReferrals,
        pending_payments: ticketsNeedPayment.length,
      },
      active_groups: activeGroups,
      tickets_need_payment: ticketsNeedPayment.map((t) => ({
        id: t.id,
        ticket_code: t.ticket_code,
        group_name: t.group.name,
        amount: t.group.ticket_price,
      })),
      referral_code: user.referral_code,
    };
  }
}
