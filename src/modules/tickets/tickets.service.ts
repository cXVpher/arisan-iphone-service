import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { Group, GroupStatus } from '../groups/entities/group.entity';
import { GroupMember } from '../groups/entities/group-member.entity';
import { BuyTicketDto } from './dto/buy-ticket.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private readonly memberRepo: Repository<GroupMember>,
  ) {}

  private generateTicketCode(): string {
    const hex = randomBytes(3).toString('hex').toUpperCase();
    return `TKT-${hex}`;
  }

  async buyTicket(dto: BuyTicketDto, userId: string): Promise<any> {
    const group = await this.groupRepo.findOne({
      where: { id: dto.group_id },
    });
    if (!group) {
      throw new NotFoundException(`Group ${dto.group_id} not found`);
    }
    if (group.status !== GroupStatus.ACTIVE) {
      throw new BadRequestException(
        'Tickets can only be purchased for active groups',
      );
    }

    // Auto-join group if not already member
    const existing = await this.memberRepo.findOne({
      where: { group_id: dto.group_id, user_id: userId },
    });
    if (!existing) {
      const member = this.memberRepo.create({
        group_id: dto.group_id,
        user_id: userId,
      });
      await this.memberRepo.save(member);
    }

    let ticket_code: string = '';
    let isUnique = false;
    // Retry loop to guarantee uniqueness
    while (!isUnique) {
      ticket_code = this.generateTicketCode();
      const exists = await this.ticketRepo.findOne({ where: { ticket_code } });
      if (!exists) isUnique = true;
    }

    const ticket = this.ticketRepo.create({
      ticket_code,
      user_id: userId,
      group_id: dto.group_id,
      status: TicketStatus.PENDING_PAYMENT,
    });

    const saved = await this.ticketRepo.save(ticket);

    // Load with relations
    const ticketWithRelations = await this.ticketRepo.findOne({
      where: { id: saved.id },
      relations: ['user', 'group'],
    });

    if (!ticketWithRelations) {
      throw new NotFoundException('Ticket not found after creation');
    }

    return {
      id: ticketWithRelations.id,
      ticket_code: ticketWithRelations.ticket_code,
      status: ticketWithRelations.status,
      created_at: ticketWithRelations.created_at,
      user: {
        id: ticketWithRelations.user.id,
        username: ticketWithRelations.user.username,
        name: ticketWithRelations.user.name,
      },
      group: {
        id: ticketWithRelations.group.id,
        name: ticketWithRelations.group.name,
      },
    };
  }

  async findByUser(userId: string): Promise<any[]> {
    const tickets = await this.ticketRepo.find({
      where: { user_id: userId },
      relations: ['user', 'group'],
      order: { created_at: 'DESC' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticket_code: t.ticket_code,
      status: t.status,
      created_at: t.created_at,
      user: {
        id: t.user.id,
        username: t.user.username,
        name: t.user.name,
      },
      group: {
        id: t.group.id,
        name: t.group.name,
      },
    }));
  }

  async findByUserAndGroup(userId: string, groupId: string): Promise<any[]> {
    if (!userId || !groupId) {
      throw new BadRequestException('userId and groupId query params are required');
    }
    const tickets = await this.ticketRepo.find({
      where: { user_id: userId, group_id: groupId },
      relations: ['user', 'group'],
      order: { created_at: 'DESC' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticket_code: t.ticket_code,
      status: t.status,
      created_at: t.created_at,
      user: {
        id: t.user.id,
        username: t.user.username,
        name: t.user.name,
      },
      group: {
        id: t.group.id,
        name: t.group.name,
      },
    }));
  }
}
