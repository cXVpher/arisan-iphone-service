import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group, GroupStatus } from '../../groups/entities/group.entity';
import { GroupMember } from '../../groups/entities/group-member.entity';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { Ticket, TicketStatus } from '../../tickets/entities/ticket.entity';

export interface StatsResponse {
  groups: {
    total: number;
    by_status: {
      pending: number;
      waiting: number;
      full: number;
      active: number;
      completed: number;
    };
  };
  members: {
    total_users: number;
    total_slots_filled: number;
  };
  payments: {
    total_verified: number;
    pending_review: number;
  };
  action_items: {
    groups_without_ketua: number;
    groups_full_not_activated: number;
    payments_pending: number;
  };
}

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async getStats(): Promise<StatsResponse> {
    // Get all groups count
    const totalGroups = await this.groupRepo.count();

    // Get groups by status
    const groupsByStatus = await this.groupRepo
      .createQueryBuilder('g')
      .select('g.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('g.status')
      .getRawMany();

    const statusCounts = {
      pending: 0,
      waiting: 0,
      full: 0,
      active: 0,
      completed: 0,
    };

    groupsByStatus.forEach((row) => {
      if (row.status in statusCounts) {
        statusCounts[row.status] = parseInt(row.count, 10);
      }
    });

    // Get total unique users who joined at least 1 group
    const totalUniqueUsers = await this.memberRepo
      .createQueryBuilder('gm')
      .select('COUNT(DISTINCT gm.user_id)', 'count')
      .getRawOne();

    // Get total slots filled (count of all memberships)
    const totalSlotsFilled = await this.memberRepo.count();

    // Get total verified payments
    const verifiedPayments = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.status = :status', { status: PaymentStatus.VERIFIED })
      .getRawOne();

    // Get pending payments count
    const pendingPayments = await this.paymentRepo.count({
      where: { status: PaymentStatus.PENDING },
    });

    // Get groups without ketua (excluding completed groups)
    const groupsWithoutKetua = await this.groupRepo
      .createQueryBuilder('g')
      .leftJoin(
        (qb) =>
          qb
            .select('DISTINCT gm.group_id')
            .from(GroupMember, 'gm')
            .where('gm.is_ketua = :isKetua', { isKetua: true }),
        'gm_ketua',
        'gm_ketua.group_id = g.id',
      )
      .where('gm_ketua.group_id IS NULL')
      .andWhere('g.status != :completed', { completed: GroupStatus.COMPLETED })
      .getCount();

    // Get groups that are full but not activated
    const groupsFullNotActivated = await this.groupRepo.count({
      where: {
        status: GroupStatus.FULL,
      },
    });

    return {
      groups: {
        total: totalGroups,
        by_status: statusCounts,
      },
      members: {
        total_users: parseInt(totalUniqueUsers.count || 0, 10),
        total_slots_filled: totalSlotsFilled,
      },
      payments: {
        total_verified: parseInt(verifiedPayments.total || 0, 10),
        pending_review: pendingPayments,
      },
      action_items: {
        groups_without_ketua: groupsWithoutKetua,
        groups_full_not_activated: groupsFullNotActivated,
        payments_pending: pendingPayments,
      },
    };
  }

  async getUserTickets(userId: string): Promise<any[]> {
    const tickets = await this.ticketRepo.find({
      where: { user_id: userId },
      relations: ['group', 'user'],
      order: { created_at: 'DESC' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticket_code: t.ticket_code,
      status: t.status,
      created_at: t.created_at,
      group: {
        id: t.group.id,
        name: t.group.name,
        ticket_price: t.group.ticket_price,
        status: t.group.status,
      },
      user: {
        id: t.user.id,
        username: t.user.username,
        name: t.user.name,
      },
    }));
  }
}
