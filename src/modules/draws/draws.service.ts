import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomBytes } from 'crypto';
import { Draw, DrawStatus } from './entities/draw.entity';
import { Group, GroupStatus } from '../groups/entities/group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { Ticket, TicketStatus } from '../tickets/entities/ticket.entity';

@Injectable()
export class DrawsService {
  constructor(
    @InjectRepository(Draw)
    private readonly drawRepo: Repository<Draw>,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly dataSource: DataSource,
  ) {}

  async createScheduledDraw(groupId: string, activatedAt: Date): Promise<Draw> {
    const scheduledDate = new Date(activatedAt);
    scheduledDate.setDate(scheduledDate.getDate() + 30);

    const draw = this.drawRepo.create({
      group_id: groupId,
      status: DrawStatus.SCHEDULED,
      scheduled_date: scheduledDate,
    });
    return this.drawRepo.save(draw);
  }

  async spin(groupId: string, requestingUserId: string): Promise<Draw> {
    // 1. Validate group exists and is ACTIVE
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException(`Group ${groupId} not found`);
    if (group.status !== GroupStatus.ACTIVE) {
      throw new BadRequestException('Group is not active');
    }

    // 2. Validate requester is ketua
    const member = await this.memberRepo.findOne({
      where: { group_id: groupId, user_id: requestingUserId },
    });
    if (!member || !member.is_ketua) {
      throw new ForbiddenException('Only the ketua can perform the spin');
    }

    // 3. Validate draw exists and scheduled_date has passed
    const draw = await this.drawRepo.findOne({
      where: { group_id: groupId, status: DrawStatus.SCHEDULED },
    });
    if (!draw) {
      throw new NotFoundException('No scheduled draw found for this group');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduledDate = new Date(draw.scheduled_date);
    scheduledDate.setHours(0, 0, 0, 0);

    if (today < scheduledDate) {
      throw new BadRequestException(
        `Draw is not yet available. Scheduled for ${scheduledDate.toISOString().split('T')[0]}`,
      );
    }

    // 4. Fetch all active tickets for this group
    const activeTickets = await this.ticketRepo.find({
      where: { group_id: groupId, status: TicketStatus.ACTIVE },
    });

    if (activeTickets.length === 0) {
      throw new BadRequestException('No active tickets found for this group');
    }

    // 5. Crypto-random winner selection
    const winnerTicket = this.pickRandom(activeTickets);
    const winnerUserId = winnerTicket.user_id;

    // 6. Post-spin transaction
    await this.dataSource.transaction(async (manager) => {
      // Winning ticket → WON
      await manager.update(Ticket, winnerTicket.id, { status: TicketStatus.WON });

      // All other tickets of winner → WON
      await manager
        .createQueryBuilder()
        .update(Ticket)
        .set({ status: TicketStatus.WON })
        .where('group_id = :groupId', { groupId })
        .andWhere('user_id = :userId', { userId: winnerUserId })
        .andWhere('id != :winnerTicketId', { winnerTicketId: winnerTicket.id })
        .andWhere('status = :status', { status: TicketStatus.ACTIVE })
        .execute();

      // All active tickets of other users → EXPIRED
      await manager
        .createQueryBuilder()
        .update(Ticket)
        .set({ status: TicketStatus.EXPIRED })
        .where('group_id = :groupId', { groupId })
        .andWhere('user_id != :userId', { userId: winnerUserId })
        .andWhere('status = :status', { status: TicketStatus.ACTIVE })
        .execute();

      // Draw → COMPLETED
      await manager.update(Draw, draw.id, {
        status: DrawStatus.COMPLETED,
        winner_user_id: winnerUserId,
        winner_ticket_id: winnerTicket.id,
        drawn_at: new Date(),
      });

      // Group → COMPLETED
      await manager.update(Group, groupId, { status: GroupStatus.COMPLETED });
    });

    return this.drawRepo.findOne({ where: { id: draw.id } }) as Promise<Draw>;
  }

  async getDrawResult(groupId: string): Promise<Draw> {
    const draw = await this.drawRepo.findOne({
      where: { group_id: groupId, status: DrawStatus.COMPLETED },
    });
    if (!draw) {
      throw new NotFoundException('No completed draw found for this group');
    }
    return draw;
  }

  async getHistory(groupId: string): Promise<Draw[]> {
    return this.drawRepo.find({
      where: { group_id: groupId },
      order: { created_at: 'DESC' },
    });
  }

  private pickRandom<T>(arr: T[]): T {
    // crypto-random index for fairness
    const randomBuffer = randomBytes(4);
    const randomValue = randomBuffer.readUInt32BE(0);
    const index = randomValue % arr.length;
    return arr[index];
  }
}
